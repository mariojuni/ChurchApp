import React from 'react';

const PrayingHands = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 11.5V11a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v5a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6v-4.5Z" />
    <path d="M14 7V3.5a2.5 2.5 0 0 0-5 0V7" />
    <path d="M9 11.5V7" />
    <path d="M14 11.5V7" />
  </svg>
);

export default PrayingHands;
