import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Maximize2 } from 'lucide-react';
import styles from './ProductGallery.module.css';

const ProductGallery = ({ images, productName, mainImageIndex, setMainImageIndex, isImageModalOpen, setIsImageModalOpen }) => {

  const nextImage = (e) => {
    e?.stopPropagation();
    setMainImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    setMainImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <>
      <div className={styles.galleryWrapper}>
        <div className={styles.mainImageContainer}>
          {images.length > 1 && (
            <button className={`${styles.navArrowBtn} ${styles.prevBtn}`} onClick={prevImage}>
              <ChevronLeft size={24} />
            </button>
          )}
          <img src={images[mainImageIndex]} alt={productName} className={styles.mainImage} />
          <button className={styles.maximizeBtn} onClick={() => setIsImageModalOpen(true)}>
            <Maximize2 size={20} />
          </button>
          {images.length > 1 && (
            <button className={`${styles.navArrowBtn} ${styles.nextBtn}`} onClick={nextImage}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className={styles.thumbnailList}>
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`${styles.thumbnailItem} ${mainImageIndex === idx ? styles.activeThumb : ''}`}
                onClick={() => setMainImageIndex(idx)}
              >
                <img src={img} alt={`Thumbnail ${idx}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {isImageModalOpen && (
        <div className={styles.imageModalOverlay} onClick={() => setIsImageModalOpen(false)}>
          <div className={styles.imageModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.imageModalClose} onClick={() => setIsImageModalOpen(false)}>
              <X size={32} />
            </button>
            {images.length > 1 && (
              <button className={`${styles.modalNavArrow} ${styles.modalPrevBtn}`} onClick={prevImage}>
                <ChevronLeft size={48} />
              </button>
            )}
            <img src={images[mainImageIndex]} alt={productName} className={styles.imageModalImage} />
            {images.length > 1 && (
              <button className={`${styles.modalNavArrow} ${styles.modalNextBtn}`} onClick={nextImage}>
                <ChevronRight size={48} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductGallery;
