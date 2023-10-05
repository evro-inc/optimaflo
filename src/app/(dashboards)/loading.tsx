'use client';
import React from 'react';
import { motion } from 'framer-motion';

const loadingVariants = {
  animationOne: {
    x: [-20, 20],
    y: [0, -30],
    transition: {
      x: {
        yoyo: Infinity,
        duration: 0.5,
      },
      y: {
        yoyo: Infinity,
        duration: 0.25,
        ease: 'easeOut',
      },
    },
  },
};

export default function Loading() {
  return (
    <>
      <p>Loading</p>
      <motion.div
        className="w-10 h-10 bg-blue-500 rounded-full mt-10 mx-auto"
        variants={loadingVariants}
        animate="animationOne"
      ></motion.div>
    </>
  );
}
