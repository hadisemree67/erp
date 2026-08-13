// -----------------------------------------------------------------------------
// Bileşen Adı: Geniş Açılır Menü (Mega Menu)
// Açıklama: Tüm ana ve alt kategorilerin detaylı olarak sergilendiği, görsel destekli geniş açılır menüdür.
// -----------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowRight, Box } from 'lucide-react';
import styles from './MegaMenu.module.css';
import { categoriesList as staticCategories, megaMenuData as staticMenuData } from './megaMenuData';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
      return (
        <div style={{ padding: 20, background: 'red', color: 'white', position: 'absolute', top: '100%', left: 0, zIndex: 999 }}>
          <h2>MegaMenu Error!</h2>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const MegaMenuContent = ({ isOpen }) => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [activeCategory, setActiveCategory] = useState('cilt');
  const [categoriesList, setCategoriesList] = useState(staticCategories);
  const [megaMenuData, setMegaMenuData] = useState(staticMenuData);
  // 2. Yan Etkiler ve Veri Çekme (useEffect)

  useEffect(() => {
    fetch('http://localhost:3000/api/web-categories/tree')
      .then(res => res.json())
      .then(data => {
        let newCatList = [...staticCategories];
        let newMenuData = { ...staticMenuData };

        data.forEach(cat => {
          const existingCatIndex = newCatList.findIndex(c => c.id === cat.slug);
          
          if (existingCatIndex === -1) {
            newCatList.push({
              id: cat.slug,
              name: cat.name,
              icon: <Box size={18} strokeWidth={1.5} />,
              url: `/kategori/${cat.slug}`
            });
            
            newMenuData[cat.slug] = {
              mainTitle: cat.name,
              description: `${cat.name} kategorisi ürünleri.`,
              url: `/kategori/${cat.slug}`,
              columns: (cat.subcategories || []).map(sub => ({
                title: sub.name,
                icon: Box,
                url: `/kategori/${cat.slug}/${sub.slug}`,
                links: (sub.subtitles || []).map(title => ({
                  name: title.name,
                  url: `/kategori/${cat.slug}/${sub.slug}/${title.slug}`
                }))
              }))
            };
          } else {
            const existingMenu = newMenuData[cat.slug];
            if (existingMenu && cat.subcategories) {
              const existingCols = existingMenu.columns || [];
              const newCols = existingCols.map(c => ({ ...c, links: c.links ? [...c.links] : [] }));
              
              cat.subcategories.forEach(sub => {
                const existingCol = newCols.find(c => c.title === sub.name);
                if (!existingCol) {
                  newCols.push({
                    title: sub.name,
                    icon: Box,
                    url: `/kategori/${cat.slug}/${sub.slug}`,
                    links: (sub.subtitles || []).map(title => ({
                      name: title.name,
                      url: `/kategori/${cat.slug}/${sub.slug}/${title.slug}`
                    }))
                  });
                } else {
                  (sub.subtitles || []).forEach(title => {
                    const existingLink = existingCol.links.find(l => l.name === title.name);
                    if (!existingLink) {
                      existingCol.links.push({
                        name: title.name,
                        url: `/kategori/${cat.slug}/${sub.slug}/${title.slug}`
                      });
                    }
                  });
                }
              });
              
              newMenuData[cat.slug] = {
                ...existingMenu,
                columns: newCols
              };
            }
          }
        });

        setCategoriesList(newCatList);
        setMegaMenuData(newMenuData);
      })
      .catch(err => console.error(err));
  }, []);

  if (!isOpen) return null;

  const currentData = megaMenuData[activeCategory] || megaMenuData['cilt'];

  if (!currentData) return null;

  return (
    <div className={styles.megaMenuWrapper}>
      <div className={styles.mainCategories}>
        {categoriesList.map((cat) => (
          <a
            href={cat.url || '#'}
            key={cat.id}
            className={`${styles.categoryItem} ${activeCategory === cat.id ? styles.active : ''}`}
            onMouseEnter={() => setActiveCategory(cat.id)}
          >
            <div className={styles.categoryItemLeft}>
              <span className={styles.iconWrapper}>{cat.icon || <Box size={18} strokeWidth={1.5} />}</span>
              <span>{cat.name}</span>
            </div>
            <ChevronRight size={14} color="var(--text-light)" />
          </a>
        ))}
      </div>

      <div className={styles.subMenuContainer} key={activeCategory}>
        <div className={styles.mainContentArea}>
          <div className={styles.headerArea}>
            <a href={currentData.url || '#'} className={styles.sectionMainTitle}>{currentData.mainTitle || ''}</a>
            <p className={styles.sectionDescription}>{currentData.description || ''}</p>
          </div>

          <div className={styles.columnsWrapper}>
            {Array.isArray(currentData.columns) && currentData.columns.map((col, index) => {
              if (!col) return null;
              const Icon = col.icon;
              
              let colUrl = col.url;
              if (!colUrl) {
                if (col.bottomLink) {
                  colUrl = col.bottomLink.url;
                } else if (Array.isArray(col.links) && col.links[0] && col.links[0].url) {
                  const parts = col.links[0].url.split('/');
                  parts.pop();
                  colUrl = parts.join('/');
                } else {
                  colUrl = '#';
                }
              }

              return (
                <div key={index} className={styles.column}>
                  <a href={colUrl} className={styles.columnTitle}>
                    {Icon && (typeof Icon === 'function' || typeof Icon === 'object') && !React.isValidElement(Icon) && (
                      <Icon size={16} strokeWidth={1.5} className={styles.columnTitleIcon} />
                    )}
                    {col.title || ''}
                  </a>
                  <div className={styles.linksContainer}>
                    {Array.isArray(col.links) && col.links.map((link, idx) => (
                      link && <a href={link.url || '#'} key={idx} className={styles.subLink}>{link.name || ''}</a>
                    ))}
                  </div>
                  {col.bottomLink && (
                    <a href={col.bottomLink.url || '#'} className={styles.bottomLink}>
                      {col.bottomLink.text || ''} <ArrowRight size={12} strokeWidth={2} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {currentData.popularSearches && (
            <div className={styles.popularSearches}>
              <span className={styles.popularTitle}>Popüler Aramalar</span>
              <div className={styles.pillsContainer}>
                {currentData.popularSearches.map((search, idx) => (
                  <a href={search.url} key={idx} className={styles.pill}>{search.name}</a>
                ))}
              </div>
            </div>
          )}
        </div>

        {currentData.adBanner && (
          <div className={styles.adBanner}>
            <span className={styles.adTag}>{currentData.adBanner.tag}</span>
            <div className={styles.adTitle}>{currentData.adBanner.title}</div>
            <div className={styles.adText}>{currentData.adBanner.text}</div>
            <a href={currentData.adBanner.url} className={styles.adButton}>
              {currentData.adBanner.buttonText} <ArrowRight size={14} />
            </a>
            <div className={styles.adImageWrapper}>
              <img
                src={currentData.adBanner.image}
                alt={currentData.mainTitle}
                className={styles.adImage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MegaMenu = (props) => (
  <ErrorBoundary>
    <MegaMenuContent {...props} />
  </ErrorBoundary>
);

export default MegaMenu;
