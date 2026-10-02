import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { product, quantity, shopId }
      shopId: null, // The ID of the shop the items belong to

      // Add or increment item
      addItem: (product, shopId) => {
        const { items, shopId: currentShopId } = get();

        // Check if trying to add from a different shop
        if (currentShopId && currentShopId !== shopId) {
          throw new Error('You can only order from one shop at a time. Please clear your cart first.');
        }

        const existingItem = items.find((item) => item.product.id === product.id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { product, quantity: 1, shopId }],
            shopId: shopId,
          });
        }
      },

      // Decrement or remove item
      removeItem: (productId) => {
        const { items } = get();
        const existingItem = items.find((item) => item.product.id === productId);

        if (!existingItem) return;

        if (existingItem.quantity > 1) {
          set({
            items: items.map((item) =>
              item.product.id === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item
            ),
          });
        } else {
          const newItems = items.filter((item) => item.product.id !== productId);
          set({
            items: newItems,
            shopId: newItems.length === 0 ? null : get().shopId,
          });
        }
      },
      
      // Delete completely regardless of quantity
      deleteItem: (productId) => {
        const { items } = get();
        const newItems = items.filter((item) => item.product.id !== productId);
        set({
          items: newItems,
          shopId: newItems.length === 0 ? null : get().shopId,
        });
      },

      clearCart: () => set({ items: [], shopId: null }),

      // Computed totals
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((total, item) => total + item.product.price * item.quantity, 0),
    }),
    {
      name: 'buzzer-cart-storage', // key in localStorage
    }
  )
);

export default useCartStore;
