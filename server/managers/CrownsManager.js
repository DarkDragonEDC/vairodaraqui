import { getStoreItem } from '../../shared/crownStore.js';

export class CrownsManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    /**
     * Get current crown balance for a character
     */
    getCrowns(char) {
        return char?.state?.crowns || 0;
    }

    /**
     * Add crowns to a character (after payment confirmation)
     * @param {Object} char - Character object
     * @param {number} amount - Amount of crowns to add
     * @param {string} source - Source of crowns (e.g., 'PURCHASE', 'ADMIN', 'GIFT')
     * @returns {Object} Result with success status and new balance
     */
    addCrowns(char, amount, source = 'ADMIN') {
        if (!char?.state) {
            return { success: false, error: 'Invalid character' };
        }

        if (amount <= 0 || !Number.isInteger(amount)) {
            return { success: false, error: 'Invalid amount' };
        }

        // Initialize crowns if not present
        if (typeof char.state.crowns !== 'number') {
            char.state.crowns = 0;
        }

        char.state.crowns += amount;

        // Log transaction
        this.logTransaction(char, {
            type: 'ADD',
            amount,
            source,
            timestamp: Date.now(),
            balanceAfter: char.state.crowns
        });

        console.log(`[CROWNS] Added ${amount} crowns to ${char.name} (source: ${source}). New balance: ${char.state.crowns}`);

        return {
            success: true,
            amount,
            newBalance: char.state.crowns
        };
    }

    /**
     * Spend crowns on a store item
     * @param {Object} char - Character object
     * @param {string} itemId - Store item ID
     * @returns {Object} Result with purchased item info
     */
    async purchaseItem(char, itemId) {
        if (!char?.state) {
            return { success: false, error: 'Invalid character' };
        }

        const item = getStoreItem(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        const currentBalance = this.getCrowns(char);
        if (currentBalance < item.cost) {
            return {
                success: false,
                error: 'Insufficient crowns',
                required: item.cost,
                current: currentBalance
            };
        }

        // Check max purchases for limited items
        if (item.maxPurchases) {
            const purchaseCount = this.getPurchaseCount(char, itemId);
            if (purchaseCount >= item.maxPurchases) {
                return { success: false, error: 'Maximum purchases reached for this item' };
            }
        }

        // Deduct crowns
        char.state.crowns -= item.cost;

        // Apply item effect
        const applyResult = await this.applyItemEffect(char, item);
        if (!applyResult.success) {
            // Refund on failure
            char.state.crowns += item.cost;
            return applyResult;
        }

        // Log transaction
        this.logTransaction(char, {
            type: 'PURCHASE',
            itemId,
            cost: item.cost,
            timestamp: Date.now(),
            balanceAfter: char.state.crowns
        });

        // Track purchase count
        this.incrementPurchaseCount(char, itemId);

        console.log(`[CROWNS] ${char.name} purchased ${item.name} for ${item.cost} crowns. New balance: ${char.state.crowns}`);

        return {
            success: true,
            item,
            newBalance: char.state.crowns,
            ...applyResult
        };
    }

    /**
     * Apply the effect of a purchased item
     */
    async applyItemEffect(char, item) {
        switch (item.category) {
            case 'BOOST':
                return this.applyBoost(char, item);
            case 'CONVENIENCE':
                return this.applyConvenience(char, item);
            case 'COSMETIC':
                return this.applyCosmetic(char, item);
            default:
                return { success: false, error: 'Unknown item category' };
        }
    }

    /**
     * Apply a temporary boost
     */
    applyBoost(char, item) {
        if (!char.state.active_buffs) {
            char.state.active_buffs = {};
        }

        const buffs = typeof char.state.active_buffs === 'string'
            ? JSON.parse(char.state.active_buffs)
            : char.state.active_buffs;

        buffs[item.effect] = {
            value: item.value,
            expiresAt: Date.now() + item.duration,
            source: 'CROWN_PURCHASE'
        };

        char.state.active_buffs = buffs;

        return {
            success: true,
            message: `${item.name} activated for 24 hours!`,
            expiresAt: buffs[item.effect].expiresAt
        };
    }

    /**
     * Apply convenience items
     */
    applyConvenience(char, item) {
        switch (item.id) {
            case 'INVENTORY_EXPANSION':
                if (!char.state.inventorySlots) {
                    char.state.inventorySlots = 50; // Default
                }
                char.state.inventorySlots += 10;
                return {
                    success: true,
                    message: `Inventory expanded! New capacity: ${char.state.inventorySlots} slots`
                };

            case 'NAME_CHANGE':
                // Set a flag that allows name change
                char.state.pendingNameChange = true;
                return {
                    success: true,
                    message: 'Name change token acquired! Use it in your profile settings.'
                };

            case 'CHARACTER_SLOT':
                // This would be handled at account level, not character level
                // For now, just return success
                return {
                    success: true,
                    message: 'Character slot unlocked!'
                };

            default:
                return { success: false, error: 'Unknown convenience item' };
        }
    }

    /**
     * Apply cosmetic items
     */
    applyCosmetic(char, item) {
        if (!char.state.cosmetics) {
            char.state.cosmetics = {};
        }

        switch (item.id) {
            case 'PREMIUM_FRAME':
                char.state.cosmetics.frame = 'golden';
                return { success: true, message: 'Golden frame unlocked!' };

            case 'TITLE_CROWN_OWNER':
                char.state.cosmetics.title = 'Crown Owner';
                return { success: true, message: 'Title "Crown Owner" unlocked!' };

            default:
                return { success: false, error: 'Unknown cosmetic item' };
        }
    }

    /**
     * Log crown transaction for audit
     */
    logTransaction(char, transaction) {
        if (!char.state.crownTransactions) {
            char.state.crownTransactions = [];
        }

        // Keep only last 100 transactions
        if (char.state.crownTransactions.length >= 100) {
            char.state.crownTransactions = char.state.crownTransactions.slice(-99);
        }

        char.state.crownTransactions.push(transaction);
    }

    /**
     * Get purchase count for an item
     */
    getPurchaseCount(char, itemId) {
        if (!char.state.crownPurchases) {
            return 0;
        }
        return char.state.crownPurchases[itemId] || 0;
    }

    /**
     * Increment purchase count
     */
    incrementPurchaseCount(char, itemId) {
        if (!char.state.crownPurchases) {
            char.state.crownPurchases = {};
        }
        char.state.crownPurchases[itemId] = (char.state.crownPurchases[itemId] || 0) + 1;
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(char) {
        return char.state.crownTransactions || [];
    }
}
