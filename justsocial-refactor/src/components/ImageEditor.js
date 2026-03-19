import React, { useState, useRef, useEffect } from 'react';
import '../login.css';

function ImageEditor({ imageSrc, onSave, onCancel }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDetecting, setIsDetecting] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Detect subject using image analysis (finding area with most detail/contrast)
  const detectSubject = (img) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.min(img.naturalWidth, 400); // Downscale for performance
      canvas.height = Math.min(img.naturalHeight, 400);
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate edge density and find the subject center
      const blockSize = 20; // Analyze in blocks
      const blocksX = Math.floor(canvas.width / blockSize);
      const blocksY = Math.floor(canvas.height / blockSize);
      const blockScores = [];
      
      for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
          let edgeCount = 0;
          let totalIntensity = 0;
          
          for (let y = by * blockSize; y < Math.min((by + 1) * blockSize, canvas.height); y++) {
            for (let x = bx * blockSize; x < Math.min((bx + 1) * blockSize, canvas.width); x++) {
              const idx = (y * canvas.width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const intensity = (r + g + b) / 3;
              totalIntensity += intensity;
              
              // Simple edge detection - check neighbors
              if (x > 0 && y > 0 && x < canvas.width - 1 && y < canvas.height - 1) {
                const nextIdx = (y * canvas.width + (x + 1)) * 4;
                const nextIntensity = (data[nextIdx] + data[nextIdx + 1] + data[nextIdx + 2]) / 3;
                const diff = Math.abs(intensity - nextIntensity);
                if (diff > 30) edgeCount++;
              }
            }
          }
          
          const avgIntensity = totalIntensity / (blockSize * blockSize);
          // Score based on edges and avoiding very dark/bright areas (likely background)
          const score = edgeCount * 2 + (avgIntensity > 30 && avgIntensity < 220 ? 10 : 0);
          blockScores.push({ x: bx, y: by, score });
        }
      }
      
      // Find the block with highest score (most likely subject)
      blockScores.sort((a, b) => b.score - a.score);
      const topBlock = blockScores[0];
      
      if (topBlock && topBlock.score > 0) {
        // Convert block coordinates back to image coordinates
        const subjectX = (topBlock.x + 0.5) * blockSize * (img.naturalWidth / canvas.width);
        const subjectY = (topBlock.y + 0.5) * blockSize * (img.naturalHeight / canvas.height);
        resolve({ x: subjectX, y: subjectY, confidence: topBlock.score });
      } else {
        // Fallback to center
        resolve({ x: img.naturalWidth / 2, y: img.naturalHeight / 2, confidence: 0 });
      }
    });
  };

  // Detect subject and auto-center when image loads
  useEffect(() => {
    if (!imageSrc || !imageRef.current || !containerRef.current) return;

    const detectAndCenter = async () => {
      setIsDetecting(true);
      const img = imageRef.current;
      
      // Wait for image to load
      if (!img.complete || img.naturalWidth === 0) {
        const handleLoad = () => {
          img.removeEventListener('load', handleLoad);
          detectAndCenter();
        };
        img.addEventListener('load', handleLoad);
        return;
      }

      try {
        // Detect subject using image analysis
        const subject = await detectSubject(img);
        
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const containerSize = Math.min(containerWidth, containerHeight);
        const cropSize = containerSize * 0.8; // The circular crop is 80% of container
        const cropCenterX = containerWidth / 2;
        const cropCenterY = containerHeight / 2;
        
        // Calculate how the image is displayed (object-fit: cover)
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = containerWidth / containerHeight;
        
        let displayWidth, displayHeight, displayX, displayY;
        if (imgAspect > containerAspect) {
          // Image is wider - fit to height
          displayHeight = containerHeight;
          displayWidth = displayHeight * imgAspect;
          displayX = (containerWidth - displayWidth) / 2;
          displayY = 0;
        } else {
          // Image is taller - fit to width
          displayWidth = containerWidth;
          displayHeight = displayWidth / imgAspect;
          displayX = 0;
          displayY = (containerHeight - displayHeight) / 2;
        }
        
        // Convert subject coordinates from natural image to display coordinates
        const subjectDisplayX = displayX + (subject.x / img.naturalWidth) * displayWidth;
        const subjectDisplayY = displayY + (subject.y / img.naturalHeight) * displayHeight;
        
        // Calculate optimal scale - if subject detected with good confidence, zoom in
        let optimalScale = 1;
        if (subject.confidence > 50) {
          // Scale to make subject area take up about 60-70% of crop
          optimalScale = (cropSize * 0.65) / (cropSize * 0.4); // Assume subject is ~40% of image
          optimalScale = Math.max(1, Math.min(optimalScale, 2.5));
        } else {
          // Lower confidence or no clear subject - use moderate zoom
          optimalScale = 1.2;
        }
        
        // Calculate position offset to center the subject in the crop area
        const offsetX = (cropCenterX - subjectDisplayX) / optimalScale;
        const offsetY = (cropCenterY - subjectDisplayY) / optimalScale;
        
        setScale(optimalScale);
        setPosition({ x: offsetX, y: offsetY });
      } catch (error) {
        console.warn('Subject detection error:', error);
        // Fallback to center the image
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = containerWidth / containerHeight;
        
        let initialScale = 1;
        if (imgAspect > containerAspect) {
          initialScale = containerHeight / img.naturalHeight;
        } else {
          initialScale = containerWidth / img.naturalWidth;
        }
        
        initialScale = initialScale * 1.2;
        const scaledWidth = img.naturalWidth * initialScale;
        const scaledHeight = img.naturalHeight * initialScale;
        
        setScale(initialScale);
        setPosition({
          x: (containerWidth - scaledWidth) / 2,
          y: (containerHeight - scaledHeight) / 2
        });
      } finally {
        setIsDetecting(false);
      }
    };

    detectAndCenter();
  }, [imageSrc]);

  const handleZoom = (newScale) => {
    setScale(Math.max(0.5, Math.min(3, newScale)));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    // Create canvas to crop the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const outputSize = 400; // Higher resolution for better quality (1:1 aspect ratio)
      canvas.width = outputSize;
      canvas.height = outputSize;
      
      // Get container dimensions
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      const containerSize = Math.min(containerWidth, containerHeight);
      const cropSize = containerSize * 0.8; // Match the circular overlay size (80% of container)
      const cropCenterX = containerWidth / 2;
      const cropCenterY = containerHeight / 2;
      
      // Create a temporary canvas to render the current view
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = containerWidth;
      tempCanvas.height = containerHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Calculate how the image should be drawn to match the display
      // The image fills the container with object-fit: cover
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = containerWidth / containerHeight;
      
      let drawWidth, drawHeight, drawX, drawY;
      if (imgAspect > containerAspect) {
        // Image is wider - fit to height
        drawHeight = containerHeight;
        drawWidth = drawHeight * imgAspect;
        drawX = (containerWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        // Image is taller - fit to width
        drawWidth = containerWidth;
        drawHeight = drawWidth / imgAspect;
        drawX = 0;
        drawY = (containerHeight - drawHeight) / 2;
      }
      
      // Apply scale transform
      const scaledWidth = drawWidth * scale;
      const scaledHeight = drawHeight * scale;
      const scaledX = drawX - (scaledWidth - drawWidth) / 2;
      const scaledY = drawY - (scaledHeight - drawHeight) / 2;
      
      // Apply position transform (position is relative to center after scale)
      const offsetX = position.x * scale;
      const offsetY = position.y * scale;
      const finalX = scaledX + offsetX;
      const finalY = scaledY + offsetY;
      
      // Draw the image with transforms applied
      tempCtx.drawImage(img, finalX, finalY, scaledWidth, scaledHeight);
      
      // Now crop the circular area from the temp canvas
      ctx.clearRect(0, 0, outputSize, outputSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Draw the cropped area from temp canvas to output canvas
      const cropLeft = cropCenterX - cropSize / 2;
      const cropTop = cropCenterY - cropSize / 2;
      ctx.drawImage(
        tempCanvas,
        cropLeft, cropTop, cropSize, cropSize, // Source: square crop from temp canvas
        0, 0, outputSize, outputSize // Destination: full output canvas
      );
      
      ctx.restore();
      
      // Convert to blob and call onSave
      canvas.toBlob((blob) => {
        onSave(blob);
      }, 'image/jpeg', 0.92);
    };
    
    img.src = imageSrc;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchMove = (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        setPosition({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y
        });
      }
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, dragStart]);

  return (
    <div className="login-overlay">
      <div className="login-modal" style={{ 
        maxHeight: '90vh', 
        width: '95vw', 
        maxWidth: '400px',
        padding: '0',
        borderRadius: '0'
      }}>
        {/* Header Bar - Mobile Style */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: '#000',
          borderBottom: '1px solid #333',
          position: 'sticky',
          top: '0',
          zIndex: '10',
          minHeight: '60px'
        }}>
          {/* Left - Back Arrow */}
          <div style={{ flex: '0 0 auto' }}>
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                minWidth: '40px',
                minHeight: '40px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ←
            </button>
          </div>

          {/* Center - Title */}
          <div style={{ 
            flex: '1', 
            textAlign: 'center',
            margin: '0 16px'
          }}>
            <h3 style={{ 
              margin: 0, 
              color: '#fff', 
              fontSize: '18px',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              Edit media
            </h3>
          </div>

          {/* Right - Apply Button */}
          <div style={{ flex: '0 0 auto' }}>
            <button
              onClick={handleApply}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s',
                minWidth: '80px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Image Container - Square (1:1) Aspect Ratio */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            aspectRatio: '1 / 1', // Square container
            maxHeight: '60vh',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#000',
            margin: '0 auto'
          }}
        >
          {isDetecting && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '14px',
              zIndex: 5,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '8px 16px',
              borderRadius: '8px'
            }}>
              Detecting face...
            </div>
          )}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Profile"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translate(-50%, -50%) scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              userSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchStart(e);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              handleTouchMove(e);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleTouchEnd();
            }}
            draggable={false}
          />
          
          {/* Circular Preview Overlay - Shows how it will appear as profile picture */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            height: '80%',
            maxWidth: '300px',
            maxHeight: '300px',
            border: '2px solid #1da1f2',
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            zIndex: 2
          }} />
          
          {/* Square crop guide (hidden, for reference) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            height: '80%',
            maxWidth: '300px',
            maxHeight: '300px',
            border: '1px dashed rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1,
            display: 'none' // Hidden by default, can be shown for debugging
          }} />
        </div>

        {/* Zoom Controls - Bottom */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '20px',
          backgroundColor: '#000'
        }}>
          <span style={{ color: '#fff', fontSize: '16px' }}>🔍-</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={scale}
            onChange={(e) => handleZoom(parseFloat(e.target.value))}
            style={{
              width: '200px',
              height: '4px',
              background: '#333',
              outline: 'none',
              borderRadius: '2px',
              WebkitAppearance: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{ color: '#fff', fontSize: '16px' }}>🔍+</span>
        </div>
      </div>
    </div>
  );
}

export default ImageEditor; 