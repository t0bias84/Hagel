import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Eye,
  EyeOff,
  PlusCircle,
  Slash,
  XCircle,
  Edit
} from "lucide-react";

/**
 * ShotPatternVisualization
 * ========================
 * - Mörk bakgrund => text i "badge" => ex. <span className="bg-white text-black px-1 ...">
 * - Pan & Zoom
 * - Add/Remove hits (knapp + klick)
 * - Justera ring
 */
export default function ShotPatternVisualization({
  imageUrl,
  analysisData,
  showAdvancedStats=false,
  onHitsChange,
  onRingChange,
  className=""
}) {
  const safeData= analysisData||{};
  const hits= safeData.hits||[];
  const ring= safeData.ring||{};
  const containerRef= useRef(null);

  const [scale, setScale]= useState(1);
  const [pan, setPan]= useState({x:0,y:0});
  const [isDragging, setIsDragging]= useState(false);
  const [dragStart, setDragStart]= useState({x:0,y:0});

  const [showGrid, setShowGrid]= useState(true);
  const [addingHit, setAddingHit]= useState(false);
  const [removingHit, setRemovingHit]= useState(false);
  const [manualRingMode, setManualRingMode]= useState(false);

  const [ringDragMode, setRingDragMode]= useState("idle");
  const [tempRing, setTempRing]= useState(
    (typeof ring.centerX==="number")? {...ring}: { centerX:50, centerY:50, radius_px:20 }
  );

  const [hoveredHit, setHoveredHit]= useState(null);

  let aspectRatio="1/1";
  if (safeData.metadata?.image_dimensions?.width && safeData.metadata?.image_dimensions?.height){
    const w= safeData.metadata.image_dimensions.width;
    const h= safeData.metadata.image_dimensions.height;
    if (w>0 && h>0){
      aspectRatio= `${w} / ${h}`;
    }
  }

  const handleWheel= useCallback((e)=>{
    e.preventDefault();
    const delta= e.deltaY* -0.002;
    setScale(prev=>{
      let newS= prev + delta;
      return Math.min(Math.max(0.5, newS), 5);
    });
  },[]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const handleMouseDown=(e)=>{
    if (!containerRef.current) return;
    if (addingHit){
      addHit(e);
      return;
    }
    if (removingHit){
      removeHit(e);
      return;
    }
    if (manualRingMode){
      handleRingMouseDown(e);
      return;
    }
    // Pan
    setIsDragging(true);
    const rect= containerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - pan.x - rect.left,
      y: e.clientY - pan.y - rect.top
    });
  };

  const handleMouseMove=(e)=>{
    if (isDragging){
      const rect= containerRef.current.getBoundingClientRect();
      setPan({
        x: e.clientX- dragStart.x - rect.left,
        y: e.clientY- dragStart.y - rect.top
      });
    } else if (manualRingMode && ringDragMode!=="idle"){
      dragRing(e);
    }
  };

  const handleMouseUp= ()=>{
    setIsDragging(false);
    if (manualRingMode && ringDragMode!=="idle"){
      if (typeof onRingChange==="function"){
        onRingChange(tempRing);
      }
      setRingDragMode("idle");
    }
  };

  const handleMouseLeave=()=>{
    setIsDragging(false);
    if (manualRingMode && ringDragMode!=="idle"){
      if (typeof onRingChange==="function"){
        onRingChange(tempRing);
      }
      setRingDragMode("idle");
    }
  };

  const resetView= ()=>{
    setScale(1);
    setPan({x:0,y:0});
  };

  function addHit(e){
    if (!hits || !containerRef.current) return;
    const rect= containerRef.current.getBoundingClientRect();
    const offsetX= (e.clientX - rect.left - pan.x)/scale;
    const offsetY= (e.clientY - rect.top - pan.y)/scale;
    const cw= rect.width/scale;
    const ch= rect.height/scale;

    const xPct= (offsetX/cw)*100;
    const yPct= (offsetY/ch)*100;

    const newHit= { x:xPct, y:yPct, source:"manual"};
    const updated= [...hits, newHit];
    if (typeof onHitsChange==="function"){
      onHitsChange(updated);
    }
  }

  function removeHit(e){
    if (!hits||!containerRef.current) return;
    const rect= containerRef.current.getBoundingClientRect();
    const offsetX= (e.clientX - rect.left - pan.x)/scale;
    const offsetY= (e.clientY - rect.top - pan.y)/scale;
    const cw= rect.width/scale;
    const ch= rect.height/scale;

    let foundIndex=-1;
    let minDist= Infinity;
    hits.forEach((hit, idx)=>{
      const hx= (hit.x/100)*cw;
      const hy= (hit.y/100)*ch;
      const dist= Math.sqrt((hx-offsetX)**2 + (hy-offsetY)**2);
      if (dist< minDist){
        minDist= dist;
        foundIndex= idx;
      }
    });
    if (foundIndex>-1 && minDist<20){
      const updated= [...hits];
      updated.splice(foundIndex,1);
      if (typeof onHitsChange==="function"){
        onHitsChange(updated);
      }
    }
  }

  function handleRingMouseDown(e){
    if (!tempRing|| !containerRef.current) return;
    const rect= containerRef.current.getBoundingClientRect();
    const offsetX= (e.clientX - rect.left - pan.x)/scale;
    const offsetY= (e.clientY - rect.top - pan.y)/scale;
    const cw= rect.width/scale;
    const ch= rect.height/scale;

    const ringCenterX= (tempRing.centerX/100)*cw;
    const ringCenterY= (tempRing.centerY/100)*ch;
    const ringRadiusPx= (tempRing.radius_px/100)*cw;

    const dist= Math.sqrt((ringCenterX-offsetX)**2 + (ringCenterY-offsetY)**2);
    if (dist<10){
      setRingDragMode("moveCenter");
    } else if (Math.abs(dist- ringRadiusPx)<10){
      setRingDragMode("resizeRadius");
    } else {
      setRingDragMode("idle");
    }
  }

  function dragRing(e){
    if(ringDragMode==="idle"|| !containerRef.current) return;
    const rect= containerRef.current.getBoundingClientRect();
    const offsetX= (e.clientX - rect.left - pan.x)/scale;
    const offsetY= (e.clientY - rect.top - pan.y)/scale;
    const cw= rect.width/scale;
    const ch= rect.height/scale;

    if (ringDragMode==="moveCenter"){
      const xPct= Math.min(Math.max(0,(offsetX/cw)*100),100);
      const yPct= Math.min(Math.max(0,(offsetY/ch)*100),100);
      setTempRing(prev=>({...prev, centerX:xPct, centerY:yPct}));
    } else if (ringDragMode==="resizeRadius"){
      const ringCenterX= (tempRing.centerX/100)*cw;
      const ringCenterY= (tempRing.centerY/100)*ch;
      const dist= Math.sqrt((ringCenterX-offsetX)**2 + (ringCenterY-offsetY)**2);
      const distPct= (dist/cw)*100;
      setTempRing(prev=>({...prev, radius_px: Math.max(2, distPct)}));
    }
  }

  return (
    <div
      className={`relative border border-military-600 rounded-lg overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Topp-rad */}
      <div className="flex items-center gap-2 p-2 border-b border-military-600 bg-military-800 text-gray-100">
        {/* Toggle grid */}
        <button
          onClick={()=> setShowGrid(!showGrid)}
          className="px-2 py-1 rounded bg-military-700 hover:bg-military-600 text-sm"
        >
          {showGrid? "Dölj rutnät": "Visa rutnät"}
        </button>
        {/* Zoom in */}
        <button
          onClick={()=> setScale(s=> Math.min(5,s+0.1))}
          className="px-2 py-1 rounded bg-military-700 hover:bg-military-600 text-sm flex items-center"
        >
          <ZoomIn size={16}/>
        </button>
        {/* Zoom out */}
        <button
          onClick={()=> setScale(s=> Math.max(0.5,s-0.1))}
          className="px-2 py-1 rounded bg-military-700 hover:bg-military-600 text-sm flex items-center"
        >
          <ZoomOut size={16}/>
        </button>
        {/* Reset */}
        <button
          onClick={resetView}
          className="px-2 py-1 rounded bg-military-700 hover:bg-military-600 text-sm flex items-center"
        >
          <RefreshCw size={16}/>
        </button>
      </div>

      {/* Bild-container */}
      <div
        ref={containerRef}
        className="relative bg-military-900 w-full h-full"
        style={{ touchAction:"none", cursor:"crosshair"}}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {imageUrl? (
          <img
            src={imageUrl}
            alt="Shot Pattern"
            className="absolute inset-0 pointer-events-none"
            style={{
              objectFit:"contain",
              width:"100%",
              height:"100%",
              transform:`translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin:"0 0"
            }}
          />
        ):(
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Ingen bild
          </div>
        )}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform:`translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin:"0 0",
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),"+
                "linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize:"10% 10%"
            }}
          />
        )}
        {/* Overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform:`translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin:"0 0"
          }}
        >
          {(ring || manualRingMode) && Number.isFinite(tempRing.centerX) && (
            <RingOverlay
              ring={manualRingMode? tempRing: ring}
              showAdvanced={showAdvancedStats}
            />
          )}
          {hits.map((hit, idx)=>(
            <HitMarker
              key={idx}
              hit={hit}
              onHover={setHoveredHit}
              onLeave={()=> setHoveredHit(null)}
            />
          ))}
        </div>

        {hoveredHit && (
          <HitTooltip
            hit={hoveredHit}
            containerRect={containerRef.current?.getBoundingClientRect()}
            scale={scale}
            pan={pan}
          />
        )}
      </div>

      {/* Nedersta menyrad */}
      <div className="p-2 flex items-center gap-2 border-t border-military-600 bg-military-800 text-gray-100">
        {/* Lägg till träff */}
        <button
          onClick={()=>{
            setAddingHit(!addingHit);
            setRemovingHit(false);
          }}
          className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
            addingHit? "bg-green-600 text-white":"bg-military-700 hover:bg-military-600"
          }`}
        >
          {addingHit? <Slash size={16}/> : <PlusCircle size={16}/> }
          {addingHit? "Lägg till: PÅ":"Lägg till träff"}
        </button>

        {/* Ta bort träff */}
        <button
          onClick={()=>{
            setRemovingHit(!removingHit);
            setAddingHit(false);
          }}
          className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
            removingHit? "bg-red-600 text-white":"bg-military-700 hover:bg-military-600"
          }`}
        >
          {removingHit? <Slash size={16}/> : <XCircle size={16}/> }
          {removingHit? "Ta bort: PÅ":"Ta bort träff"}
        </button>

        {/* Justera ring */}
        <button
          onClick={()=> setManualRingMode(!manualRingMode)}
          className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
            manualRingMode? "bg-blue-600 text-white":"bg-military-700 hover:bg-military-600"
          }`}
        >
          {manualRingMode? <Slash size={16}/> : <Edit size={16}/>}
          {manualRingMode? "Ring-läge: PÅ":"Justera ring"}
        </button>
      </div>
    </div>
  );
}

/* Delkomponenter */

function HitMarker({ hit, onHover, onLeave }){
  const color = hit.source==="manual"? "bg-red-400":"bg-red-600";
  return (
    <div
      className={`absolute ${color} w-3 h-3 rounded-full border border-white`}
      style={{
        left:`${hit.x}%`,
        top:`${hit.y}%`,
        transform:"translate(-50%,-50%)"
      }}
      onMouseEnter={()=> onHover?.(hit)}
      onMouseLeave={onLeave}
    />
  );
}

function RingOverlay({ ring, showAdvanced=false }){
  if (
    !ring ||
    !Number.isFinite(ring.centerX) ||
    !Number.isFinite(ring.centerY) ||
    !Number.isFinite(ring.radius_px)
  ){
    return null;
  }
  const style={
    left:`${ring.centerX}%`,
    top:`${ring.centerY}%`,
    width:`${ring.radius_px*2}%`,
    height:`${ring.radius_px*2}%`,
    transform:"translate(-50%,-50%)",
    borderColor:"rgba(59,130,246,0.8)"
  };
  return (
    <div
      className="absolute border-2 border-dashed rounded-full pointer-events-none"
      style={style}
    >
      {showAdvanced && (
        <div
          className="absolute text-xs bg-white text-black py-1 px-2 rounded shadow"
          style={{
            top:"100%",
            left:"50%",
            transform:"translate(-50%,0)",
            marginTop:4
          }}
        >
          <p>
            Center: {ring.centerX.toFixed(1)}%, {ring.centerY.toFixed(1)}%
          </p>
          <p>Radius: {ring.radius_px.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}

function HitTooltip({ hit, containerRect, scale, pan }){
  if (!containerRect) return null;
  const offset=10;
  const xPx= (hit.x/100)* containerRect.width*scale + pan.x;
  const yPx= (hit.y/100)* containerRect.height*scale + pan.y;

  return (
    <div
      className="absolute z-10 bg-white text-xs p-2 rounded shadow text-gray-800"
      style={{
        left: xPx+offset,
        top: yPx+offset
      }}
    >
      <p>X: {hit.x.toFixed(1)}%</p>
      <p>Y: {hit.y.toFixed(1)}%</p>
      <p>Källa: {hit.source||"auto"}</p>
    </div>
  );
}
