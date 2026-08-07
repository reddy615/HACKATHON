import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { trackSessionEvent } from '../services/sessionTracking';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user || authLoading) {
      setCart({ items: [], subtotal: 0 });
      return;
    }

    try {
      const response = await api.get('/carts');
      setCart(response.data?.data?.cart || { items: [], subtotal: 0 });
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch cart', error);
      }
      setCart({ items: [], subtotal: 0 });
    }
  }, [authLoading, user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    try {
      const response = await api.post('/carts/items', { productId, quantity });
      setCart(response.data?.data?.cart || { items: [], subtotal: 0 });
      trackSessionEvent({
        eventType: 'cart_update',
        action: 'add_item',
        page: window.location.pathname,
        productId,
        quantity,
      });
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    if (!user) {
      throw new Error('Authentication required');
    }

    if (quantity < 1) return removeFromCart(itemId);
    setLoading(true);
    try {
      const response = await api.put(`/carts/items/${itemId}`, { quantity });
      setCart(response.data?.data?.cart || { items: [], subtotal: 0 });
      trackSessionEvent({
        eventType: 'cart_update',
        action: 'update_quantity',
        page: window.location.pathname,
        quantity,
      });
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const removeFromCart = useCallback(async (itemId) => {
    if (!user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    try {
      const response = await api.delete(`/carts/items/${itemId}`);
      setCart(response.data?.data?.cart || { items: [], subtotal: 0 });
      trackSessionEvent({
        eventType: 'cart_update',
        action: 'remove_item',
        page: window.location.pathname,
      });
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearCart = useCallback(async () => {
    if (!user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    try {
      const response = await api.delete('/carts/clear');
      setCart(response.data?.data?.cart || { items: [], subtotal: 0 });
      trackSessionEvent({
        eventType: 'cart_update',
        action: 'clear_cart',
        page: window.location.pathname,
      });
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const value = useMemo(
    () => ({ cart, loading, fetchCart, addToCart, updateQuantity, removeFromCart, clearCart }),
    [cart, loading, fetchCart, addToCart, updateQuantity, removeFromCart, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
