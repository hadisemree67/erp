import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './AddressModal.module.css';

// Şehir ve İlçe verileri (Dinamik olarak yüklenecek)
const AddressModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [cityDistricts, setCityDistricts] = useState({});
  const [loadingCities, setLoadingCities] = useState(false);
  const [formData, setFormData] = React.useState({
    title: '',
    name: '',
    phone: '',
    city: '',
    district: '',
    neighborhood: '',
    addressDetail: '',
    isDefault: false
  });

  const [neighborhoods, setNeighborhoods] = React.useState([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          title: '', name: '', phone: '', city: '', district: '', neighborhood: '', addressDetail: '', isDefault: false
        });
      }
    }
  }, [isOpen, initialData]);

  React.useEffect(() => {
    if (isOpen && Object.keys(cityDistricts).length === 0) {
      setLoadingCities(true);
      fetch('https://raw.githubusercontent.com/isubas/iller_ve_ilceler/master/iller_ve_ilceler.json')
        .then(res => res.json())
        .then(resData => {
          const formatted = {};
          const toTitleCase = (str) => {
            return str.toLocaleLowerCase('tr-TR').replace(/(?:^|\s)\S/g, function(a) {
                return a.toLocaleUpperCase('tr-TR');
            });
          };

          if (resData) {
             Object.values(resData).forEach(city => {
                 const cityName = toTitleCase(city.ad);
                 // Store object with name and id
                 const districts = city.ilceler ? city.ilceler.map(d => ({ name: toTitleCase(d.ad), id: d.kod })) : [];
                 formatted[cityName] = districts.sort((a,b) => a.name.localeCompare(b.name, 'tr'));
             });
          }
          
          // Sort cities alphabetically
          const sortedFormatted = Object.keys(formatted).sort((a, b) => a.localeCompare(b, 'tr')).reduce(
            (acc, key) => {
              acc[key] = formatted[key];
              return acc;
            },
            {}
          );

          setCityDistricts(sortedFormatted);
          setLoadingCities(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingCities(false);
        });
    }
  }, [isOpen, cityDistricts]);

  React.useEffect(() => {
    if (formData.district && formData.city && cityDistricts[formData.city]) {
      const selectedDistrict = cityDistricts[formData.city].find(d => d.name === formData.district);
      if (selectedDistrict && selectedDistrict.id) {
        setLoadingNeighborhoods(true);
        fetch(`https://api.turkiyeapi.dev/v1/neighborhoods?districtId=${selectedDistrict.id}`)
          .then(res => res.json())
          .then(resData => {
            if (resData && resData.data) {
              const toTitleCase = (str) => {
                return str.toLocaleLowerCase('tr-TR').replace(/(?:^|\s)\S/g, function(a) {
                    return a.toLocaleUpperCase('tr-TR');
                });
              };
              const nList = resData.data.map(n => toTitleCase(n.name)).sort((a,b) => a.localeCompare(b, 'tr'));
              setNeighborhoods(nList);
            } else {
              setNeighborhoods([]);
            }
            setLoadingNeighborhoods(false);
          })
          .catch(err => {
            console.error("Mahalleler yüklenemedi:", err);
            setNeighborhoods([]);
            setLoadingNeighborhoods(false);
          });
      } else {
        setNeighborhoods([]);
      }
    } else {
      setNeighborhoods([]);
    }
  }, [formData.district, formData.city, cityDistricts]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Eğer şehir değişiyorsa, ilçeyi sıfırla
    if (name === 'city') {
      setFormData(prev => ({
        ...prev,
        city: value,
        district: '', // Yeni şehir seçildiğinde ilçeyi sıfırla
        neighborhood: ''
      }));
    } else if (name === 'district') {
      setFormData(prev => ({
        ...prev,
        district: value,
        neighborhood: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    // Reset form
    setFormData({
      title: '',
      name: '',
      phone: '',
      city: '',
      district: '',
      neighborhood: '',
      addressDetail: '',
      isDefault: false
    });
  };

  // Seçili şehrin ilçelerini al
  const currentDistricts = formData.city ? cityDistricts[formData.city] || [] : [];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Yeni Adres Ekle</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Adres Başlığı</label>
            <input 
              type="text" 
              name="title"
              placeholder="Örn. Evim, İşyerim, Yazlık vb." 
              value={formData.title}
              onChange={handleChange}
              required 
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Ad Soyad</label>
              <input 
                type="text" 
                name="name"
                placeholder="Adınız Soyadınız" 
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefon</label>
              <input 
                type="tel" 
                name="phone"
                placeholder="05XX XXX XX XX" 
                value={formData.phone}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>İl</label>
              <select name="city" value={formData.city} onChange={handleChange} required>
                <option value="">İl seçiniz</option>
                {Object.keys(cityDistricts).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>İlçe</label>
              <select 
                name="district" 
                value={formData.district} 
                onChange={handleChange} 
                required
                disabled={!formData.city}
              >
                <option value="">İlçe seçiniz</option>
                {currentDistricts.map(district => (
                  <option key={district.id} value={district.name}>{district.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Mahalle</label>
            <select 
              name="neighborhood" 
              value={formData.neighborhood} 
              onChange={handleChange} 
              required
              disabled={!formData.district || loadingNeighborhoods}
            >
              <option value="">{loadingNeighborhoods ? "Yükleniyor..." : "Mahalle seçiniz"}</option>
              {neighborhoods.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Adres</label>
            <div className={styles.textareaWrapper}>
              <textarea 
                name="addressDetail"
                placeholder="Açık adresinizi yazınız..." 
                rows="3"
                value={formData.addressDetail}
                onChange={handleChange}
                required
              ></textarea>
              <span className={styles.charCount}>{formData.addressDetail.length}/250</span>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="isDefault" 
              name="isDefault"
              checked={formData.isDefault}
              onChange={handleChange}
            />
            <label htmlFor="isDefault">Bu adresi varsayılan adresim olarak kullan</label>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>İptal</button>
            <button type="submit" className={styles.saveBtn}>Adresi Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressModal;
