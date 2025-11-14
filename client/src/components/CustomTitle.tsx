import React from 'react';

// IMPORTANT: Replace './path/to/your/logo.png' with the actual path to your logo file
import LogoImage from '/synapse-logo.png'; 

// Define the custom SVG Title component
const CustomTitle: React.FC = () => (
  // The outer div maintains the correct spacing and alignment properties
  <div className="flex items-center mr-4 h-full">
    {/* The SVG block is replaced with an HTML <img> tag.
      You may need to adjust the 'h-6' (24px) class depending on 
      the desired height of your logo relative to the toolbar icons.
    */}
    <img
      src={LogoImage} 
      alt="Synapse Logo" 
      className="h-6 w-auto" // Set the height to match the original SVG height (24px)
    />
  </div>
);

export default CustomTitle;