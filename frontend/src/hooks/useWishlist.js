import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export const useWishlist = () => {
  const { user, loading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user || authLoading) {
      setWishlist([]);
      return;
    }

    try {
      const response = await api.get('/wishlist');
      setWishlist(response.data?.data?.wishlist || []);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch wishlist', error);
      }
      setWishlist([]);
    }
  }, [authLoading, user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(async (productId) => {
    if (!user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    try {
      const response = await api.post('/wishlist/toggle', { productId });
      const nextWishlist = response.data?.data?.wishlist || [];
      setWishlist(nextWishlist);
      return nextWishlist;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { wishlist, loading, fetchWishlist, toggleWishlist };
};
