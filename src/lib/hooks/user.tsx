import { setUserDetails } from '@/src/app/redux/userSlice';
import { setSubscription } from '@/src/app/redux/subscriberSlice';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setLoading } from '@/src/app/redux/globalSlice';

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
      } catch (error) {
        console.error('Failed to fetch user details:', error);
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
    const fetchSubscription = async () => {
      dispatch(setLoading(true)); // Set loading state to true before fetching
      try {
        const res = await fetch(`/api/subscriptions/${userId}`);
        const data = await res.json();
        dispatch(setSubscription(data));
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
      dispatch(setLoading(false)); // Set loading state to false after fetching
    };

    if (userId) fetchSubscription();
  }, [userId, dispatch]);
};
