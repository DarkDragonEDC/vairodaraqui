// Crown Store - Premium items purchasable with Crowns

export const CROWN_STORE = {
    // Real money packages to get Crowns
    PACKAGES: {
        CROWNS_250: {
            id: 'CROWNS_250',
            name: '250 Crowns',
            description: 'Pack with +25 Bonus Crowns!',
            price: 6.99,
            amount: 275,
            icon: '💎',
            category: 'PACKAGE',
            currency: 'USD'
        },
        CROWNS_500: {
            id: 'CROWNS_500',
            name: '500 Crowns',
            description: 'Pack with +50 Bonus Crowns!',
            price: 13.99,
            amount: 550,
            icon: '💰',
            category: 'PACKAGE',
            currency: 'USD',
            bestSeller: true
        },
        CROWNS_1000: {
            id: 'CROWNS_1000',
            name: '1000 Crowns',
            description: 'Pack with +100 Bonus Crowns!',
            price: 25.99,
            amount: 1100,
            icon: '📦',
            category: 'PACKAGE',
            currency: 'USD'
        },
        CROWNS_2500: {
            id: 'CROWNS_2500',
            name: '2500 Crowns',
            description: 'Pack with +250 Bonus Crowns! (Best Value)',
            price: 64.99,
            amount: 2750,
            icon: '👑',
            category: 'PACKAGE',
            currency: 'USD',
            premium: true
        }
    },
    BOOSTS: {},
    CONVENIENCE: {},
    COSMETICS: {}
};

// Helper to get all store items as flat array
export const getAllStoreItems = () => {
    const items = [];
    Object.values(CROWN_STORE).forEach(category => {
        Object.values(category).forEach(item => {
            items.push(item);
        });
    });
    return items;
};

// Get item by ID
export const getStoreItem = (itemId) => {
    for (const category of Object.values(CROWN_STORE)) {
        for (const item of Object.values(category)) {
            if (item.id === itemId) return item;
        }
    }
    return null;
};
