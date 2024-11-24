import { setUserDetails } from '@/src/redux/userSlice';
import { setSubscription } from '@/src/redux/subscriberSlice';
import { useEffect } from 'react';
import { setLoading } from '@/src/redux/globalSlice';
import { setError } from '@/src/redux/tableSlice';
import { useDispatch, useSelector } from 'react-redux';

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
export const useSubscription = (userId) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userId) return;

    const fetchSubscription = async () => {
      dispatch(setLoading(true));
      try {
        const response = await fetch(`/api/subscriptions/${userId}`);
        const data = await response.json();
        dispatch(setSubscription(data));
      } catch (error) {
        throw new Error('Failed to fetch subscription:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchSubscription();
  }, [userId, dispatch]);
};

export const useError = () => {
  const dispatch = useDispatch();
  const error = useSelector((state: any) => state.table.error);

  const setErrorState = (errorMessage) => dispatch(setError(errorMessage));
  const clearError = () => dispatch(setError(null));

  return { error, setErrorState, clearError };
};
