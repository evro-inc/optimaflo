import { setUserDetails } from '@/src/redux/userSlice';
import { setSubscription } from '@/src/redux/subscriberSlice';
import { useEffect } from 'react';
import { setLoading } from '@/src/redux/globalSlice';
import { setError } from '@/src/redux/tableSlice';
import { useDispatch, useSelector } from 'react-redux';
import { getSubscriptionsAPI } from '../lib/fetch/subscriptions';

// hooks/useUserDetails.js
export const useUserDetails = (userId) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUserDetails = async () => {
      dispatch(setLoading(true)); // Set loading state to true before fetching
      try {
        const res = await fetch(`/api/users/${userId}`);
        const data = await res.json();
        dispatch(setUserDetails(data));
      } catch (error: any) {
        throw new Error('Failed to fetch user details:', error);
      }
      dispatch(setLoading(false)); // Set loading state to false after fetching
    };

    if (userId) fetchUserDetails();
  }, [userId, dispatch]);
};

// hooks/useSubscription.js
export const useSubscription = async (userId, authToken) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userId || !authToken) return;

    const fetchSubscription = async () => {
      dispatch(setLoading(true));
      try {
        // Use the centralized API function
        const subscriptions = await getSubscriptionsAPI(userId, authToken);
        dispatch(setSubscription(subscriptions));
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        // Optionally set an error state in your Redux store
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchSubscription();
  }, [userId, authToken, dispatch]);
};

export const useError = () => {
  const dispatch = useDispatch();
  const error = useSelector((state: any) => state.table.error);

  const setErrorState = (errorMessage) => dispatch(setError(errorMessage));
  const clearError = () => dispatch(setError(null));

  return { error, setErrorState, clearError };
};
