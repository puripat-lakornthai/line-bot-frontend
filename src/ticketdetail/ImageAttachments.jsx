import React, { useState, useRef, useEffect } from 'react';

// ฟังก์ชันช่วยเช็คว่าไฟล์เป็นภาพหรือไม่ จากนามสกุล
const isImage = f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.file_name);

const ImageAttachments = ({ attachments = [], apiBase }) => {
  const images = attachments.filter(isImage);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbRef = useRef();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef(null); // สำหรับดัก touch บน overlay

  // ล็อก body scroll และกัน touchmove ภายใน overlay เมื่อเปิด lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const el = overlayRef.current;
    const stopDefault = (e) => e.preventDefault();

    if (el) {
      el.addEventListener('wheel', stopDefault, { passive: false });
      el.addEventListener('touchmove', stopDefault, { passive: false });
    }

    return () => {
      if (el) {
        el.removeEventListener('wheel', stopDefault);
        el.removeEventListener('touchmove', stopDefault);
      }
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  if (images.length === 0) return null;

   // เลื่อน thumbnail ของ index ที่ต้องการให้อยู่ในมุม
  const scrollToIndex = (index) => {
    thumbRef.current?.children?.[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  // รีเซ็ตซูมและตำแหน่งกลับค่าเริ่มต้น
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  };

  // คลิกที่ thumbnail: เลือกรูป + เปิด lightbox + รีเซ็ตซูม
  const handleThumbnailClick = (i) => {
    setSelectedIndex(i);
    scrollToIndex(i);
    setLightboxOpen(true);
    resetZoom();
  };

  // ปุ่มเลื่อนซ้าย/ขวา (บนแถบ thumbnail ด้านล่างตัวหน้า)
  const handleScrollNav = (direction) => {
    const newIndex = (selectedIndex + direction + images.length) % images.length;
    setSelectedIndex(newIndex);
    scrollToIndex(newIndex);
    resetZoom();
  };

  // ปุ่มเลื่อนซ้าย/ขวาใน lightbox
  const handleLightboxNav = (direction) => {
    const newIndex = (selectedIndex + direction + images.length) % images.length;
    setSelectedIndex(newIndex);
    resetZoom();
  };

  // ปิด lightbox แล้วเลื่อน thumbnail ให้ตรงกับรูปปัจจุบัน
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    scrollToIndex(selectedIndex);
    resetZoom();
  };

  // ซูมด้วยล้อเมาส์
  const handleWheelZoom = (e) => {
    e.preventDefault();
    setZoom(prev => {
      let next = prev + (e.deltaY < 0 ? 0.12 : -0.12);
      if (next < 1) next = 1;
      if (next > 5) next = 5;
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

   // เริ่มลากรูป (ทำงานเมื่อซูม > 1 เท่านั้น)
  const handleMouseDown = (e) => {
    if (zoom === 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastOffset.current = offset;
  };

  // ระหว่างลากรูป อัปเดต offset ตามระยะที่ลาก
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: lastOffset.current.x + dx, y: lastOffset.current.y + dy });
  };

   // เมื่อปล่อยเมาส์ออกนอกพื้นที่ เท่ากับหยุดลาก
  const handleMouseUp = () => setDragging(false);

  // รูปปัจจุบัน (อิงจาก selectedIndex)
  const current = images[selectedIndex];

  return (
    <div className="image-attachments">
      <h4 className="image-section-title">ไฟล์แนบ (รูปภาพ)</h4>

      {/* พรีวิวรูปหลักก่อนเปิด lightbox */}
      {current && (
        <div className="image-main-preview-container">
          <img
            src={`${apiBase}${current.file_path}`}
            alt="ภาพหลัก"
            className="image-main-preview"
            onClick={() => { setLightboxOpen(true); resetZoom(); }}
          />
        </div>
      )}

      {/* แถบ thumbnails ใต้รูปหลัก (ซ่อนทั้งบล็อกถ้ามีรูปเดียว) */}
      {images.length > 1 && (
        <div className="image-thumbnail-carousel">
          <button className="image-thumb-nav prev" onClick={() => handleScrollNav(-1)}>‹</button>
          <div className="image-thumbnail-scrollable" ref={thumbRef}>
            {images.map((f, i) => (
              <img
                key={i}
                src={`${apiBase}${f.file_path}`}
                className={`image-thumbnail ${i === selectedIndex ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(i)}
                alt={`thumb-${i}`}
              />
            ))}
          </div>
          <button className="image-thumb-nav next" onClick={() => handleScrollNav(1)}>›</button>
        </div>
      )}

      {/* Lightbox แสดงภาพใหญ่ + ซูม/แพนได้ */}
      {lightboxOpen && current && (
        <div
          className="image-lightbox-overlay"
          ref={overlayRef}
          onClick={handleCloseLightbox}
        >
          <div
            className="image-lightbox-inner"
            onClick={e => e.stopPropagation()} // กันคลิกทะลุ overlay
            onWheel={handleWheelZoom}          // ซูมด้วย wheel
          >
            {/* ปุ่มปิด */}
            <button className="image-lightbox-close" onClick={handleCloseLightbox}>×</button>

            {/* ปุ่มซูม: เข้า / ออก / รีเซ็ต */}
            <div className="image-lightbox-zoom-controls">
              <button onClick={() => setZoom(z => Math.min(5, z + 0.2))}>＋</button>
              <button onClick={() => setZoom(z => Math.max(1, z - 0.2))}>－</button>
              <button onClick={resetZoom}>⟳</button>
            </div>

            {/* พื้นที่ภาพหลัก (รองรับลากเพื่อแพน) */}
            <div
              className="image-lightbox-main-view"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* ปุ่มลูกศร ซ่อนเมื่อมีรูปเดียว */}
              {images.length > 1 && (
                <button className="image-lightbox-nav prev" onClick={() => handleLightboxNav(-1)}>←</button>
              )}

              {/* รูปหลัก (ซูม/แพน) */}
              <img
                src={`${apiBase}${current.file_path}`}
                className="image-lightbox-image"
                alt={`image-${selectedIndex}`}
                draggable={false}
                onDoubleClick={resetZoom} // ดับเบิลคลิกรีเซ็ต
                style={{
                  transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                  cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
                  transition: dragging ? 'none' : 'transform 0.15s ease',
                  userSelect: 'none'
                }}
              />

              {/* ถัดไป */}
              {images.length > 1 && (
                <button className="image-lightbox-nav next" onClick={() => handleLightboxNav(1)}>→</button>
              )}
            </div>

            {/* แถบ thumbnails ด้านล่างของ lightbox — ซ่อนเมื่อมีรูปเดียว */}
            {images.length > 1 && (
              <div className="image-lightbox-thumbnails">
                {images.map((f, i) => (
                  <img
                    key={i}
                    src={`${apiBase}${f.file_path}`}
                    className={`image-lightbox-thumbnail ${i === selectedIndex ? 'active' : ''}`}
                    onClick={() => { setSelectedIndex(i); resetZoom(); }}
                    alt={`thumb-${i}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAttachments;
