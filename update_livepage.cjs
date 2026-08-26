const fs = require('fs');
let code = fs.readFileSync('src/pages/LivePage.tsx', 'utf8');

// 1. Add timeline state
code = code.replace(/const \[events, setEvents\] = useState<any\[\]>\(\[\]\);/, `const [events, setEvents] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [activeProduct, setActiveProduct] = useState<any>(null);`);

// 2. Fetch timeline
code = code.replace(/setEvents\(data\.events\);/, `setEvents(data.events);
        if (data.timeline) setTimeline(data.timeline);`);

// 3. Update timeupdate to find active product
const oldTimeUpdateRegex = /const handleTimeUpdate = \(\) => {[\s\S]*?if \(!isLive\) {[\s\S]*?setCurrentTime\(now\);[\s\S]*?}[\s\S]*?};/;
const newTimeUpdate = `const handleTimeUpdate = () => {
    if (videoRef.current) {
      const now = videoRef.current.currentTime;
      if (!isLive) {
        setCurrentTime(now);
        
        // Find active product from timeline
        if (timeline && timeline.length > 0) {
          const active = timeline.find(t => now >= t.startTime && now < t.endTime);
          setActiveProduct(active ? active.product : null);
        }
      }
    }
  };`;
code = code.replace(oldTimeUpdateRegex, newTimeUpdate);

// 4. Update the "displayProduct" logic
// Find where we use live.productName and replace it with activeProduct logic
code = code.replace(/const addToCart = \(\) => {[\s\S]*?setCartItems\(\[...cartItems, { name: live\.productName, price: live\.productPrice, qty: 1 }\]\);[\s\S]*?};/, 
`const getDisplayProduct = () => {
    if (activeProduct) {
      return {
        id: activeProduct.id,
        name: activeProduct.name,
        price: activeProduct.price,
        image: activeProduct.imageUrl
      };
    }
    return {
      id: 'default',
      name: live.productName,
      price: live.productPrice,
      image: live.productImage
    };
  };

  const addToCart = () => {
    const prod = getDisplayProduct();
    setCartItems([...cartItems, { name: prod.name, price: prod.price, qty: 1 }]);
  };`);

// Update Floating Product Card (above chat)
const oldFloatingCard = /<div className="bg-black\/80 backdrop-blur-md rounded-2xl p-3 border border-white\/10 flex items-center gap-3 mb-4 shadow-xl">[\s\S]*?<\/div>/;
const newFloatingCard = `{(activeProduct || timeline.length === 0) && (
            <div className="bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-3 mb-4 shadow-xl animate-in slide-in-from-bottom-4">
              <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0">
                {getDisplayProduct().image ? (
                   <img src={getDisplayProduct().image} className="w-full h-full object-contain p-0.5" />
                ) : (
                   <div className="w-full h-full bg-gray-200 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-gray-400"/></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{getDisplayProduct().name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[#FF5A36] font-black">R$ {getDisplayProduct().price?.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setIsCartOpen(true)} className="bg-[#FF5A36] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform shrink-0">
                Comprar
              </button>
            </div>
          )}`;
code = code.replace(oldFloatingCard, newFloatingCard);

// Update Cart Product Card
code = code.replace(/<h4 className="font-bold text-white text-sm leading-tight">{live\.productName}<\/h4>/, `<h4 className="font-bold text-white text-sm leading-tight">{getDisplayProduct().name}</h4>`);
code = code.replace(/<span className="font-black text-\[#FF5A36\] text-lg">R\$ {live\.productPrice\.toFixed\(2\)}<\/span>/, `<span className="font-black text-[#FF5A36] text-lg">R$ {getDisplayProduct().price?.toFixed(2)}</span>`);
code = code.replace(/<span className="text-\[10px\] text-gray-500 line-through">R\$ {\(live\.productPrice \* 1\.5\)\.toFixed\(2\)}<\/span>/, `<span className="text-[10px] text-gray-500 line-through">R$ {(getDisplayProduct().price * 1.5).toFixed(2)}</span>`);
code = code.replace(/live\.productImage \? \([\s\S]*?<img src={live\.productImage} className="w-full h-full object-contain p-1" \/>[\s\S]*?\) : \(/, `getDisplayProduct().image ? (
                        <img src={getDisplayProduct().image} className="w-full h-full object-contain p-1" />
                      ) : (`);

fs.writeFileSync('src/pages/LivePage.tsx', code);
console.log('Updated LivePage.tsx');
