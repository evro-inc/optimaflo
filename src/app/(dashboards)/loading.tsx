'use client';
import React from 'react';
import { motion } from 'framer-motion';

const loadingVariants = {
  animationOne: {
    x: [-20, 0, 20], // Add an additional keyframe at 0 to create a smoother animation
    y: [0, -30, 0], // Add an additional keyframe at 0 to create a smoother animation
    transition: {
      x: {
        yoyo: Infinity,
        duration: 0.5,
      },
      y: {
        yoyo: Infinity,
        duration: 0.25,
        ease: 'easeInOut', // Use a smoother easing function for a more fluid animation
      },
    },
  },
};

export default function Loading() {
  return (
    <>
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Loading...
        </h1>
        <div className="h-12 w-12 text-gray-900 dark:text-gray-100" />
        <motion.div
          className="w-10 h-10 bg-blue-500 rounded-full mt-10 mx-auto"
          variants={loadingVariants}
          animate="animationOne"
        ></motion.div>
      </div>
    </>
  );
}
