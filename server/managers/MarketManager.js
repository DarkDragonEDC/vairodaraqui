import { calculateItemSellPrice } from '../../shared/items.js';

const MAX_MARKET_PRICE = 1_000_000_000_000; // 1 Trilion
const MAX_MARKET_AMOUNT = 1_000_000_000; // 1 Billion

export class MarketManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async getMarketListings(filters = {}) {
        let query = this.gameManager.supabase
            .from('market_listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.tier) query = query.eq('item_data->>tier', filters.tier.toString());
        if (filters.type) query = query.eq('item_data->>type', filters.type.toUpperCase());
        if (filters.search) query = query.ilike('item_id', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) throw error;

        // Map data to ensure seller_character_id is available even if column is missing
        return (data || []).map(l => ({
            ...l,
            seller_character_id: l.seller_character_id || l.item_data?.seller_character_id
        }));
    }

    async sellItem(userId, characterId, itemId, quantity) {
        if (!quantity || quantity <= 0) throw new Error("Invalid quantity");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const inventory = char.state.inventory;
        if (!inventory[itemId] || inventory[itemId] < quantity) {
            throw new Error("Insufficient quantity in inventory");
        }

        const itemData = this.gameManager.inventoryManager.resolveItem(itemId);
        if (!itemData) throw new Error("Invalid item");

        const pricePerUnit = calculateItemSellPrice(itemData, itemId);
        const totalSilver = pricePerUnit * quantity;

        inventory[itemId] -= quantity;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        char.state.silver = (char.state.silver || 0) + totalSilver;

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Sold ${quantity}x ${itemData.name} for ${totalSilver} Silver`, unitPrice: pricePerUnit, total: totalSilver };
    }

    async listMarketItem(userId, characterId, itemId, amount, price) {
        // Robust numeric parsing for both arguments
        let parsedAmount = Math.floor(Number(amount));
        let parsedPrice = Math.floor(Number(price));

        if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");
        if (isNaN(parsedPrice) || parsedPrice < 0) throw new Error("Invalid price");

        // Safety Caps
        if (parsedAmount > MAX_MARKET_AMOUNT) parsedAmount = MAX_MARKET_AMOUNT;
        if (parsedPrice > MAX_MARKET_PRICE) parsedPrice = MAX_MARKET_PRICE;

        if (!parsedAmount || parsedAmount <= 0) throw new Error("Invalid amount");
        if (!parsedPrice || parsedPrice <= 0) throw new Error("Invalid price");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const inventory = char.state.inventory;
        if (!inventory[itemId] || inventory[itemId] < amount) {
            throw new Error("Insufficient quantity in inventory");
        }

        const itemData = this.gameManager.inventoryManager.resolveItem(itemId);
        if (!itemData) throw new Error("Invalid item");

        inventory[itemId] -= amount;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        const { error: insertError } = await this.gameManager.supabase
            .from('market_listings')
            .insert({
                seller_id: userId,
                // Workaround: seller_character_id column is missing in DB
                // seller_character_id: char.id, 
                seller_name: char.name,
                item_id: itemId,
                item_data: { ...itemData, seller_character_id: char.id },
                amount: amount,
                price: price
            });

        if (insertError) {
            inventory[itemId] = (inventory[itemId] || 0) + amount;
            throw insertError;
        }

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Item listed successfully!` };
    }

    async buyMarketItem(buyerId, characterId, listingId, quantity = 1) {
        const qtyNum = parseInt(quantity) || 1;
        console.log(`[MarketManager] buyMarketItem: buyerId=${buyerId}, listingId=${listingId}, qtyNum=${qtyNum}`);

        const buyer = await this.gameManager.getCharacter(buyerId, characterId);
        if (!buyer) throw new Error("Buyer character not found");

        const { data: listing, error: fetchError } = await this.gameManager.supabase
            .from('market_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (fetchError || !listing) throw new Error("Listing not found or expired");
        const sellerCharId = listing.seller_character_id || listing.item_data?.seller_character_id;
        if (sellerCharId === buyer.id) throw new Error("Current character cannot buy its own item");

        const listingAmount = parseInt(listing.amount);
        if (qtyNum > listingAmount) throw new Error(`Only ${listingAmount} items available`);

        const unitPrice = listing.price / listingAmount;
        const totalCost = Math.floor(unitPrice * qtyNum);

        console.log(`[MarketManager] Calculated: unitPrice=${unitPrice}, totalCost=${totalCost}`);

        if ((buyer.state.silver || 0) < totalCost) throw new Error("Insufficient silver");

        // Deduct Silver from Buyer
        buyer.state.silver -= totalCost;

        console.log(`[MarketManager] Adding claim for buyer ${buyerId}:`, { itemId: listing.item_id, amount: qtyNum });

        this.addClaim(buyer, {
            type: 'BOUGHT_ITEM',
            itemId: listing.item_id,
            amount: qtyNum,
            timestamp: Date.now(),
            cost: totalCost
        });
        this.gameManager.addNotification(buyer, 'SUCCESS', `You bought ${qtyNum}x ${listing.item_data.name} for ${totalCost} Silver.`);
        await this.gameManager.saveState(buyer.id, buyer.state);

        // Process Seller side
        // Note: Seller might be offline or playing another character.
        let seller = await this.gameManager.getCharacter(listing.seller_id, sellerCharId || null);
        if (seller) {
            const tax = Math.floor(totalCost * 0.06);
            const sellerProfit = totalCost - tax;

            this.addClaim(seller, {
                type: 'SOLD_ITEM',
                silver: sellerProfit,
                itemId: listing.item_id, // Added itemId for better claim resolution
                amount: qtyNum,
                timestamp: Date.now()
            });
            this.gameManager.addNotification(seller, 'SUCCESS', `Your item ${listing.item_data.name} (x${qtyNum}) was sold! +${sellerProfit} Silver (after tax).`);
            await this.gameManager.saveState(seller.id, seller.state);
        }

        // Update or Delete Listing
        if (qtyNum >= listingAmount) {
            console.log(`[MarketManager] Full buy - deleting listing ${listingId}`);
            // Full Buy - Delete Listing
            const { error: deleteError } = await this.gameManager.supabase
                .from('market_listings')
                .delete()
                .eq('id', listingId);
            if (deleteError) throw deleteError;
        } else {
            console.log(`[MarketManager] Partial buy - updating listing ${listingId}. Remaining: ${listingAmount - qtyNum}`);
            // Partial Buy - Update Listing
            const remainingAmount = listingAmount - qtyNum;
            const remainingPrice = listing.price - totalCost;

            const { error: updateError } = await this.gameManager.supabase
                .from('market_listings')
                .update({
                    amount: remainingAmount,
                    price: remainingPrice
                })
                .eq('id', listingId);
            if (updateError) throw updateError;
        }

        return { success: true, message: `Bought ${qtyNum}x ${listing.item_data.name} for ${totalCost} Silver` };
    }

    async cancelMarketListing(userId, characterId, listingId) {
        const { data: listing, error: fetchError } = await this.gameManager.supabase
            .from('market_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (fetchError || !listing) throw new Error("Listing not found");
        if (listing.seller_id !== userId) throw new Error("Permission denied");

        const { error: deleteError } = await this.gameManager.supabase
            .from('market_listings')
            .delete()
            .eq('id', listingId);

        if (deleteError) throw deleteError;

        const char = await this.gameManager.getCharacter(userId, characterId);
        this.addClaim(char, {
            type: 'CANCELLED_LISTING',
            itemId: listing.item_id,
            amount: listing.amount,
            name: listing.item_data.name,
            timestamp: Date.now()
        });

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: "Listing cancelled. Item sent to Claim tab." };
    }

    addClaim(char, claimData) {
        if (!char.state.claims) char.state.claims = [];
        char.state.claims.push({
            id: Date.now().toString() + Math.random().toString().slice(2, 8),
            ...claimData
        });
    }

    async claimMarketItem(userId, characterId, claimId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char.state.claims) return { success: false, message: "No items to claim." };

        const claimIndex = char.state.claims.findIndex(c => c.id === claimId);
        if (claimIndex === -1) return { success: false, message: "Claim not found." };

        const claim = char.state.claims[claimIndex];

        if (claim.silver) {
            char.state.silver = (char.state.silver || 0) + claim.silver;
        }
        if (claim.itemId) {
            this.gameManager.inventoryManager.addItemToInventory(char, claim.itemId, claim.amount);
        }

        char.state.claims.splice(claimIndex, 1);
        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: "Claimed successfully!" };
    }
}
