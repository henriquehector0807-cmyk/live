const fs = require('fs');

let content = fs.readFileSync('src/pages/LiveEditor.tsx', 'utf8');

// 1. Remove the modal state
content = content.replace(/const \[showTimelineModal, setShowTimelineModal\] = useState\(false\);\n/, '');

// 2. Remove the modal markup completely
const modalStart = content.indexOf('{showTimelineModal && (');
if (modalStart !== -1) {
  // We need to carefully remove everything from modalStart to the end of the modal.
  // The modal is at the end of the component, just before:
  //      <Toaster position="bottom-center" />
  //    </div>
  //  );
  // }
  
  const endMarker = '<Toaster position="bottom-center" />';
  const modalEnd = content.indexOf(endMarker);
  if (modalEnd !== -1) {
    content = content.substring(0, modalStart) + content.substring(modalEnd);
  }
}

// 3. Replace the 'products' tab content
const productsTabStart = content.indexOf('{activeTab === "products" && (');
const nextTabStart = content.indexOf('{/* Empty States for other tabs */}');

const newProductsTab = `{activeTab === "products" && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold">Timeline de Exibição</h2>
                    <p className="text-gray-400 text-sm mt-1">Sincronize a exibição dos produtos com os momentos exatos do vídeo.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-0 flex-1">
                  
                  {/* Left Column: Player & Visual Timeline */}
                  <div className="flex flex-col min-h-0">
                    <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 shrink-0">
                      <div className="relative aspect-[9/16] mx-auto w-full max-w-[280px] bg-black rounded-xl overflow-hidden shadow-xl shrink-0">
                        {formData.videoUrl ? (
                          <video 
                            ref={videoRef}
                            src={formData.videoUrl} 
                            controls 
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500">Sem vídeo</div>
                        )}
                        
                        {/* Active Product Overlay Preview */}
                        {activeProduct && activeProduct.showOnVideo && (
                          <div className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3 animate-in fade-in duration-200">
                             <div className="w-12 h-12 bg-white/10 rounded-lg overflow-hidden shrink-0">
                               {activeProduct.product?.imageUrl ? <img src={activeProduct.product.imageUrl} className="w-full h-full object-cover" /> : <ShoppingBag className="w-6 h-6 m-auto text-gray-400" />}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="font-bold text-white text-sm truncate">{activeProduct.product?.name}</p>
                               <p className="text-[#FF5A36] font-bold text-xs">R$ {activeProduct.product?.price?.toFixed(2)}</p>
                             </div>
                             <button className="bg-[#FF5A36] text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase">Ver</button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Visual Timeline Below Player */}
                    <div className="mt-4 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between text-sm font-mono text-gray-400 mb-2">
                         <span>{formatTime(currentTime)}</span>
                         <span>{formatTime(duration)}</span>
                      </div>
                      <div className="relative h-24 bg-[#121212] rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-inner">
                         {/* Playhead */}
                         {duration > 0 && (
                           <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ left: \`\${(currentTime / duration) * 100}%\` }}>
                             <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                           </div>
                         )}
                         {/* Timeline Track Lines */}
                         <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px)] bg-[size:10%_100%]"></div>
                         
                         {/* Blocks */}
                         {duration > 0 && timeline.map((item, i) => {
                            const left = (item.startTime / duration) * 100;
                            const width = ((item.endTime - item.startTime) / duration) * 100;
                            const isActive = currentTime >= item.startTime && currentTime < item.endTime;
                            return (
                              <div 
                                key={item.id} 
                                className={\`absolute top-3 bottom-3 rounded-md border text-[10px] p-2 flex flex-col justify-center overflow-hidden transition-all duration-300 \${isActive ? 'bg-[#FF5A36]/30 border-[#FF5A36] text-white z-10 scale-y-105 shadow-[0_0_15px_rgba(255,90,54,0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}\`}
                                style={{ left: \`\${left}%\`, width: \`\${width}%\` }}
                                title={\`\${item.product?.name} (\${formatTime(item.startTime)} - \${formatTime(item.endTime)})\`}
                              >
                                <span className="font-bold truncate text-xs leading-none mb-1">{item.product?.name}</span>
                                <span className="font-mono opacity-60 truncate">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                              </div>
                            )
                         })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timeline Controls & List */}
                  <div className="flex flex-col min-h-0 bg-[#121212] rounded-2xl border border-white/10 overflow-hidden">
                     
                     {/* Add New Item Form (Inline) */}
                     <div className="p-5 border-b border-white/10 bg-[#1A1A1A]">
                       <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-[#FF5A36]"/> Adicionar Produto no Momento Atual</h3>
                       <form onSubmit={(e) => { e.preventDefault(); handleAddTimelineItem(e); }} className="space-y-4">
                         
                         {overlapError && (
                           <div className="bg-red-500/20 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-bold flex items-center gap-2">
                             <AlertCircle className="w-4 h-4 shrink-0" />
                             <span>{overlapError}</span>
                           </div>
                         )}

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Produto</label>
                             <select 
                               required
                               value={newTimelineItem.productId}
                               onChange={e => setNewTimelineItem({...newTimelineItem, productId: e.target.value})}
                               className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] appearance-none"
                             >
                               <option value="" disabled>Selecionar produto ▼</option>
                               {products.map(p => (
                                 <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                               ))}
                             </select>
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Início (MM:SS)</label>
                             <div className="flex gap-2">
                               <input 
                                 required type="text" placeholder="00:00"
                                 value={formatTime(newTimelineItem.startTime)}
                                 readOnly
                                 className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] font-mono text-center"
                               />
                               <button type="button" onClick={() => setNewTimelineItem({...newTimelineItem, startTime: Math.floor(videoRef.current?.currentTime || 0)})} className="shrink-0 bg-white/5 hover:bg-white/10 text-white px-3 rounded-lg text-xs font-bold transition-colors border border-white/10">
                                 <Clock className="w-4 h-4 mx-auto mb-1"/> Usar
                               </button>
                             </div>
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Fim (MM:SS)</label>
                             <div className="flex gap-2">
                               <input 
                                 required type="text" placeholder="00:00"
                                 value={formatTime(newTimelineItem.endTime)}
                                 readOnly
                                 className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] font-mono text-center"
                               />
                               <button type="button" onClick={() => setNewTimelineItem({...newTimelineItem, endTime: Math.floor(videoRef.current?.currentTime || 0)})} className="shrink-0 bg-white/5 hover:bg-white/10 text-white px-3 rounded-lg text-xs font-bold transition-colors border border-white/10">
                                 <Clock className="w-4 h-4 mx-auto mb-1"/> Usar
                               </button>
                             </div>
                           </div>
                         </div>

                         <div className="flex justify-end pt-2">
                           <button type="submit" className="bg-[#FF5A36] text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-[#e04825] transition shadow-[0_0_15px_rgba(255,90,54,0.3)] active:scale-95">
                             Adicionar à Timeline
                           </button>
                         </div>
                       </form>
                     </div>

                     <div className="p-4 bg-[#121212] border-b border-white/5 font-bold flex justify-between items-center text-sm">
                       <span>Produtos na Timeline ({timeline.length})</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-3">
                       {timeline.length === 0 ? (
                         <div className="text-center py-10 text-gray-500 text-sm">
                            <Package className="w-10 h-10 mx-auto text-gray-700 mb-3" />
                            Nenhum produto configurado.<br/>Selecione o produto e o tempo acima.
                         </div>
                       ) : (
                         timeline.sort((a,b) => a.startTime - b.startTime).map(item => (
                           <div key={item.id} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-3 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                             <div className="w-12 h-12 bg-black rounded-lg overflow-hidden shrink-0 border border-white/5 p-1 flex items-center justify-center">
                               {item.product?.imageUrl ? <img src={item.product.imageUrl} className="w-full h-full object-contain" /> : <ShoppingBag className="w-6 h-6 text-gray-500" />}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="font-bold text-white text-sm truncate">{item.product?.name}</p>
                               <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                 <span className="font-mono bg-black px-1.5 py-0.5 rounded border border-white/10">{formatTime(item.startTime)}</span>
                                 <span>até</span>
                                 <span className="font-mono bg-black px-1.5 py-0.5 rounded border border-white/10">{formatTime(item.endTime)}</span>
                                 <span className="text-[#FF5A36] ml-2 font-bold group-hover:opacity-100 opacity-0 transition-opacity">({formatTime(item.endTime - item.startTime)})</span>
                               </div>
                             </div>
                             <div className="shrink-0">
                               <button onClick={() => removeTimelineItem(item.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                  </div>

                </div>
              </div>
            )}
`;

content = content.substring(0, productsTabStart) + newProductsTab + content.substring(nextTabStart);

fs.writeFileSync('src/pages/LiveEditor.tsx', content);
console.log("Done");
