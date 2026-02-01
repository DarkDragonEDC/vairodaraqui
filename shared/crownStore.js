// Crown Store - Premium items purchasable with Crowns

export const CROWN_STORE = {
    // Real money packages to get Crowns
    PACKAGES: {
        CROWNS_100: {
            id: 'CROWNS_100',
            name: '100 Crowns',
            description: 'Starter pack of Crowns',
            price: 4.90,
            amount: 100,
            icon: '💎',
            category: 'PACKAGE',
            currency: 'BRL'
        },
        CROWNS_500: {
            id: 'CROWNS_500',
            name: '500 Crowns',
            description: 'Includes 25 bonus Crowns!',
            price: 19.90,
            amount: 525,
            icon: '💰',
            category: 'PACKAGE',
            currency: 'BRL',
            bestSeller: true
        },
        CROWNS_1000: {
            id: 'CROWNS_1000',
            name: '1000 Crowns',
            description: 'Includes 100 bonus Crowns!',
            price: 34.90,
            amount: 1100,
            icon: '📦',
            category: 'PACKAGE',
            currency: 'BRL'
        },
        CROWNS_2500: {
            id: 'CROWNS_2500',
            name: '2500 Crowns',
            description: 'Includes 300 bonus Crowns!',
            price: 79.90,
            amount: 2800,
            icon: '🏛️',
            category: 'PACKAGE',
            currency: 'BRL'
        },
        CROWNS_5000: {
            id: 'CROWNS_5000',
            name: '5000 Crowns',
            description: 'Includes 750 bonus Crowns! Best value!',
            price: 149.90,
            amount: 5750,
            icon: '🏰',
            category: 'PACKAGE',
            currency: 'BRL',
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
