const fs = require('fs');

let content = fs.readFileSync('src/pages/LiveEditor.tsx', 'utf8');

// Add Package to imports
content = content.replace(/ShoppingBag } from "lucide-react"/, 'ShoppingBag, Package } from "lucide-react"');

// Fix handleAddTimelineItem
content = content.replace(/setShowTimelineModal\(false\);/, 'setNewTimelineItem({ productId: products[0]?.id || "", startTime: 0, endTime: 0, showOnVideo: true });');

// Remove showTimelineModal block that wasn't removed properly
const modalStart = content.indexOf('{showTimelineModal && (');
if (modalStart !== -1) {
  const modalEndMarker = '<Toaster position="bottom-center" />';
  const modalEnd = content.indexOf(modalEndMarker);
  if (modalEnd !== -1) {
    content = content.substring(0, modalStart) + content.substring(modalEnd);
  }
}

fs.writeFileSync('src/pages/LiveEditor.tsx', content);
console.log('Fixed');
