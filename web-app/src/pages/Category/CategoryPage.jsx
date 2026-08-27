/**
 * ============================================================================
 * BİLEŞEN ADI: CategoryPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Kategori ve alt kategorilere göre ürünleri listeleyen, filtreleme sağlayan sayfa.
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Star, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import styles from './CategoryPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL;

const CategoryPage = () => {
  const { category, subcategory, subtitle } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState([]);
  
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [addingId, setAddingId] = useState(null);

  // --- FILTRE STATELERI ---
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // --- SIRALAMA VE GÖRÜNÜM STATELERI ---
  const [sortOrder, setSortOrder] = useState('default');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState('4'); // '4', '3', '1'

  const sortOptions = [
    { value: 'nameAsc', label: 'Alfabetik A-Z' },
    { value: 'nameDesc', label: 'Alfabetik Z-A' },
    { value: 'newest', label: 'Yeniden Eskiye' },
    { value: 'oldest', label: 'Eskiden Yeniye' },
    { value: 'priceAsc', label: 'Fiyat Artan' },
    { value: 'priceDesc', label: 'Fiyat Azalan' },
    { value: 'random', label: 'Rastgele' },
    { value: 'rating', label: 'Puana Göre' },
    { value: 'default', label: 'Varsayılan Sıralama' }
  ];

  const handleAddToCart = async (product) => {
    if (product.AvailableStock <= 0) return;
    setAddingId(product.Id);
    const res = await addToCart(product, 1);
    setAddingId(null);
    if (res.success) {
      setProducts(prev => prev.map(p =>
        p.Id === product.Id ? { ...p, AvailableStock: p.AvailableStock - 1 } : p
      ));
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/web-categories/tree`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTree(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (subcategory) params.append('subcategory', subcategory);
        if (subtitle) params.append('subtitle', subtitle);
        const res = await fetch(`${API_BASE}/api/products/public?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
          
          const queryParams = new URLSearchParams(location.search);
          const brandFromUrl = queryParams.get('brand');
          
          if (brandFromUrl) {
            setSelectedBrands([brandFromUrl]);
          } else {
            setSelectedBrands([]);
          }
          
          setMinPrice('');
          setMaxPrice('');
          setInStockOnly(false);
          setDiscountedOnly(false);
          setNewOnly(false);
          setBrandSearch('');
          setSortOrder('default');
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchProducts();
  }, [category, subcategory, subtitle, location.search]);

  const getImg = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
  };

  const catObj = tree.find(c => c.name === category);
  const subObj = catObj?.subcategories?.find(s => s.name === subcategory);
  const titleObj = subObj?.subtitles?.find(t => t.name === subtitle);

  const level = subtitle ? 'title' : subcategory ? 'sub' : 'cat';

  const bannerImg = level === 'cat' ? catObj?.image_url
                  : level === 'sub' ? subObj?.image_url
                  : titleObj?.image_url;

  const pageHeading = subtitle || subcategory || category;

  const children = level === 'cat' ? (catObj?.subcategories || []) :
                   level === 'sub' ? (subObj?.subtitles || []) : [];

  const handleChildClick = (item) => {
    if (level === 'cat') navigate(`/category/${category}/${item.name}`);
    if (level === 'sub') navigate(`/category/${category}/${subcategory}/${item.name}`);
  };

  // --- FILTRELEME MANTIGI ---

  // Ürünlerden uniq markaları çıkar ve adetleri hesapla
  const uniqueBrands = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const b = p.Brand || 'Diğer';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // En çok olan üste
  }, [products]);

  // Filtrelenmiş ürün listesi
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(p => {
      // 1. Marka Filtresi
      const bName = p.Brand || 'Diğer';
      if (selectedBrands.length > 0 && !selectedBrands.includes(bName)) return false;

      // 2. Fiyat Filtresi
      const price = parseFloat(p.SalePrice) || 0;
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;

      // 3. Stoktakiler Filtresi
      if (inStockOnly && p.AvailableStock <= 0) return false;

      return true;
    });

    // Sıralama
    let sorted = [...filtered];
    if (sortOrder === 'priceAsc') {
      sorted.sort((a, b) => (parseFloat(a.SalePrice) || 0) - (parseFloat(b.SalePrice) || 0));
    } else if (sortOrder === 'priceDesc') {
      sorted.sort((a, b) => (parseFloat(b.SalePrice) || 0) - (parseFloat(a.SalePrice) || 0));
    } else if (sortOrder === 'newest') {
      sorted.sort((a, b) => b.Id - a.Id);
    } else if (sortOrder === 'oldest') {
      sorted.sort((a, b) => a.Id - b.Id);
    } else if (sortOrder === 'nameAsc') {
      sorted.sort((a, b) => (a.ProductName || '').localeCompare(b.ProductName || ''));
    } else if (sortOrder === 'nameDesc') {
      sorted.sort((a, b) => (b.ProductName || '').localeCompare(a.ProductName || ''));
    } else if (sortOrder === 'random') {
      sorted.sort(() => Math.random() - 0.5);
    }
    
    return sorted;
  }, [products, selectedBrands, minPrice, maxPrice, inStockOnly, discountedOnly, newOnly, sortOrder]);

  const handleBrandToggle = (brandName) => {
    setSelectedBrands(prev => 
      prev.includes(brandName) 
        ? prev.filter(b => b !== brandName)
        : [...prev, brandName]
    );
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        
        {/* ── HERO BANNER ── */}
        <div className={styles.heroBanner} style={bannerImg ? { backgroundImage: `url(${getImg(bannerImg)})` } : {}}>
          <div className={styles.heroBannerOverlay}>
            <nav className={styles.breadcrumb}>
              <Link to="/">Ana Sayfa</Link>
              {category && <><ChevronRight size={13} /><Link to={`/category/${category}`}>{category}</Link></>}
              {subcategory && <><ChevronRight size={13} /><Link to={`/category/${category}/${subcategory}`}>{subcategory}</Link></>}
              {subtitle && <><ChevronRight size={13} /><span className={styles.current}>{subtitle}</span></>}
            </nav>
            <h1 className={styles.heroTitle}>{pageHeading}</h1>
          </div>
        </div>

        {/* ── ALT ÖĞE KUTULARI (Görselli kutucuklar - TAM SAYFA) ── */}
        {children.length > 0 && (
          <div className={styles.subgrid}>
            {children.map(item => (
              <button key={item.id} className={styles.subCard} onClick={() => handleChildClick(item)}>
                <div className={styles.subCardImg}>
                  {item.image_url
                    ? <img src={getImg(item.image_url)} alt={item.name} />
                    : <span className={styles.subCardEmoji}>🗂️</span>
                  }
                </div>
                <div className={styles.subCardName}>{item.name}</div>
              </button>
            ))}
          </div>
        )}

        {/* ── LAYOUT BÖLÜMÜ (Sol Sidebar + Sağ İçerik) ── */}
        <div className={styles.contentLayout}>
          
          {/* SIDEBAR */}
          <aside className={styles.sidebar}>
            
            {/* Kategori Ağacı */}
            {children.length > 0 && (
              <div className={styles.filterBlock}>
                <div className={styles.catTreeTitle}>{pageHeading} ({products.length})</div>
                <div className={styles.catTreeList}>
                  {children.map(child => (
                    <div 
                      key={child.id} 
                      className={styles.catTreeItem}
                      onClick={() => handleChildClick(child)}
                    >
                      {child.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seçiniz (Temsili placeholder menü - resimdeki gibi görünüm için) */}
            <div className={styles.filterBlock}>
              <div className={styles.filterHeader}>Seçiniz <span>-</span></div>
              <div className={styles.checkboxList}>
                  <label className={styles.checkboxItem}>
                      <input type="checkbox" disabled />
                      <span>Standart (0)</span>
                  </label>
              </div>
            </div>

            {/* Marka Filtresi */}
            {uniqueBrands.length > 0 && (
              <div className={styles.filterBlock}>
                <div className={styles.filterHeader}>Marka <span>-</span></div>
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input 
                    type="text" 
                    placeholder="Marka ara" 
                    className={styles.searchInput}
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                  />
                </div>
                <div className={styles.checkboxList}>
                  {uniqueBrands
                    .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                    .map(b => (
                    <label key={b.name} className={styles.checkboxItem}>
                      <input 
                        type="checkbox" 
                        checked={selectedBrands.includes(b.name)}
                        onChange={() => handleBrandToggle(b.name)}
                      />
                      <span>{b.name} ({b.count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Hızlı Filtreler (Stok vs) */}
            <div className={styles.filterBlock}>
               <label className={styles.checkboxItem} style={{ marginBottom: '10px' }}>
                  <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />
                  <span>Stoktakiler</span>
               </label>
               <label className={styles.checkboxItem} style={{ marginBottom: '10px' }}>
                  <input type="checkbox" checked={discountedOnly} onChange={e => setDiscountedOnly(e.target.checked)} />
                  <span>İndirimli</span>
               </label>
               <label className={styles.checkboxItem}>
                  <input type="checkbox" checked={newOnly} onChange={e => setNewOnly(e.target.checked)} />
                  <span>Yeni</span>
               </label>
            </div>

            {/* Fiyat Filtresi */}
            <div className={styles.filterBlock}>
              <div className={styles.filterHeader}>Fiyat <span className={styles.minusIcon}>−</span></div>
              <div className={styles.priceInputsWrapper}>
                <div className={styles.priceInputs}>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className={styles.priceInput} 
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className={styles.priceInput} 
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
                
                {/* Range Slider Görünümü */}
                <div className={styles.rangeSliderWrapper}>
                  <div className={styles.rangeTrack}>
                    <div className={styles.rangeFill} style={{ left: '0%', right: '0%' }}></div>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="10000" 
                    value={minPrice !== '' ? Number(minPrice) : 0} 
                    onChange={(e) => setMinPrice(e.target.value)} 
                    className={styles.rangeSliderMin}
                  />
                  <input 
                    type="range" 
                    min="0" max="10000" 
                    value={maxPrice !== '' ? Number(maxPrice) : 10000} 
                    onChange={(e) => setMaxPrice(e.target.value)} 
                    className={styles.rangeSliderMax}
                  />
                </div>
              </div>
            </div>

            <button className={styles.applyFilterBtn} onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              SEÇİMİ FİLTRELE <ChevronRight size={16} strokeWidth={2.5} />
            </button>

          </aside>

          {/* MAIN CONTENT */}
          <main className={styles.mainContent}>

            <div className={styles.header}>
              <h2 className={styles.pageTitle}>{pageHeading.toUpperCase()}</h2>
            </div>

            {/* Toolbar (Sıralama ve Görünüm) */}
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <div className={styles.customSort}>
                  <div className={styles.sortHeader} onClick={() => setIsSortOpen(!isSortOpen)}>
                    {sortOptions.find(o => o.value === sortOrder)?.label || 'Varsayılan Sıralama'}
                    <ChevronDown size={14} className={styles.chevronIcon} />
                  </div>
                  {isSortOpen && (
                    <div className={styles.sortDropdown}>
                      {sortOptions.map(opt => (
                        <div 
                          key={opt.value} 
                          className={`${styles.sortOption} ${sortOrder === opt.value ? styles.selectedOption : ''}`}
                          onClick={() => { setSortOrder(opt.value); setIsSortOpen(false); }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.toolbarRight}>
                <span className={styles.viewLabel}>Görünüm :</span>
                <button 
                  className={`${styles.viewBtn} ${viewMode === '4' ? styles.activeView : ''}`}
                  onClick={() => setViewMode('4')}
                  title="4'lü Görünüm"
                >
                  <svg width="22" height="16" viewBox="0 0 22 16" fill={viewMode === '4' ? "currentColor" : "none"} stroke={viewMode === '4' ? "none" : "currentColor"} strokeWidth="1.5">
                    <rect x="1" y="1" width="3.5" height="14" rx="1.5" />
                    <rect x="6.5" y="1" width="3.5" height="14" rx="1.5" />
                    <rect x="12" y="1" width="3.5" height="14" rx="1.5" />
                    <rect x="17.5" y="1" width="3.5" height="14" rx="1.5" />
                  </svg>
                </button>
                <button 
                  className={`${styles.viewBtn} ${viewMode === '3' ? styles.activeView : ''}`}
                  onClick={() => setViewMode('3')}
                  title="3'lü Görünüm"
                >
                  <svg width="17" height="16" viewBox="0 0 17 16" fill={viewMode === '3' ? "currentColor" : "none"} stroke={viewMode === '3' ? "none" : "currentColor"} strokeWidth="1.5">
                    <rect x="1" y="1" width="3.5" height="14" rx="1.5" />
                    <rect x="6.5" y="1" width="3.5" height="14" rx="1.5" />
                    <rect x="12" y="1" width="3.5" height="14" rx="1.5" />
                  </svg>
                </button>
                <button 
                  className={`${styles.viewBtn} ${viewMode === '1' ? styles.activeView : ''}`}
                  onClick={() => setViewMode('1')}
                  title="Liste Görünümü"
                >
                  <svg width="6" height="16" viewBox="0 0 6 16" fill={viewMode === '1' ? "currentColor" : "none"} stroke={viewMode === '1' ? "none" : "currentColor"} strokeWidth="1.5">
                    <rect x="1" y="1" width="3.5" height="14" rx="1.5" />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>Yükleniyor...</div>
            ) : filteredProducts.length > 0 ? (
              <div className={styles.productGrid} data-view={viewMode}>
                {filteredProducts.map(product => {
                  const mainImage = product.images?.length > 0
                    ? getImg(product.images[0])
                    : 'https://via.placeholder.com/300x300?text=Görsel+Yok';
                  return (
                    <div key={product.Id} className={styles.productCard}>
                      {product.AvailableStock <= 0 && (
                        <div style={{ position:'absolute',top:'12px',left:'12px',background:'#fee2e2',color:'#dc2626',padding:'4px 8px',borderRadius:'4px',fontSize:'12px',fontWeight:'bold',zIndex:10 }}>Tükendi</div>
                      )}
                      {product.AvailableStock > 0 && product.AvailableStock < 100 && (
                        <div style={{ position:'absolute',top:'12px',left:'12px',background:'#fef08a',color:'#a16207',padding:'4px 8px',borderRadius:'4px',fontSize:'12px',fontWeight:'bold',zIndex:10 }}>Azalan Stok</div>
                      )}
                      <button className={styles.favoriteBtn} onClick={() => toggleFavorite(product)}>
                        <Heart size={20} fill={isFavorite(product.Id) ? "#e11d48" : "none"} color={isFavorite(product.Id) ? "#e11d48" : "currentColor"} />
                      </button>
                      <Link to={`/product/${product.Id}`} className={styles.imageLink}>
                        <img src={mainImage} alt={product.ProductName} className={styles.productImage} />
                      </Link>
                      <div className={styles.productBrand}>{product.Brand || 'Markasız'}</div>
                      <Link to={`/product/${product.Id}`} style={{ textDecoration:'none', color:'inherit' }}>
                        <div className={styles.productName} title={product.ProductName}>{product.ProductName}</div>
                      </Link>
                      <div className={styles.ratingRow}>
                        <Star size={14} className={styles.star} fill="currentColor" />
                        <span className={styles.ratingCount}>(0)</span>
                      </div>
                      <div className={styles.productPrice}>{product.SalePrice ? `${product.SalePrice} TL` : 'Fiyat Yok'}</div>
                      <button
                        className={styles.addToCartBtn}
                        onClick={() => handleAddToCart(product)}
                        disabled={product.AvailableStock <= 0 || addingId === product.Id}
                        style={{ opacity: product.AvailableStock <= 0 ? 0.5 : 1, cursor: product.AvailableStock <= 0 ? 'not-allowed' : 'pointer' }}
                      >
                        {product.AvailableStock <= 0 ? 'TÜKENDİ' : addingId === product.Id ? 'EKLENİYOR...' : 'SEPETE EKLE'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Aradığınız kriterlere uygun ürün bulunamadı.</p>
                <button className={styles.backBtn} onClick={() => {
                   setSelectedBrands([]); setMinPrice(''); setMaxPrice(''); setInStockOnly(false); setDiscountedOnly(false); setNewOnly(false);
                }}>
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;


