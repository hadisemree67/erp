/**
 * ============================================================================
 * BİLEŞEN ADI: SkinAnalysisPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Kullanıcıya yapay zeka/anket tabanlı cilt analizi yapıp ürün öneren sayfa.
 * ============================================================================
 */
import React, { useState } from 'react';
import styles from './SkinAnalysisPage.module.css';

const questions = [
  {
    id: 1,
    question: 'Yüzünüzü yıkadıktan 30 dakika sonra cildiniz nasıl hisseder?',
    options: [
      { text: 'Gergin ve kuru', type: 'kuru' },
      { text: 'Sadece alın ve burnum yağlı (T bölgesi)', type: 'karma' },
      { text: 'Her yeri parlak ve yağlı', type: 'yagli' },
      { text: 'Rahat, herhangi bir sorun yok', type: 'normal' },
    ]
  },
  {
    id: 2,
    question: 'Gözeneklerinizin görünümü nasıldır?',
    options: [
      { text: 'Neredeyse görünmez', type: 'kuru' },
      { text: 'Sadece T bölgesinde belirgin', type: 'karma' },
      { text: 'Tüm yüzümde büyük ve belirgin', type: 'yagli' },
      { text: 'Normal boyutta', type: 'normal' },
    ]
  },
  {
    id: 3,
    question: 'Cildinizde sık sık sivilce veya siyah nokta çıkar mı?',
    options: [
      { text: 'Nadiren', type: 'kuru' },
      { text: 'Genelde sadece burun ve çenemde', type: 'karma' },
      { text: 'Evet, çok sık', type: 'yagli' },
      { text: 'Pek çıkmaz', type: 'normal' },
    ]
  }
];

const results = {
  kuru: {
    title: 'Kuru Cilt Tipine Sahipsiniz',
    desc: 'Cildiniz nemi tutmakta zorlanıyor. Yoğun nemlendirici kremler, hyaluronik asit serumları ve krem formunda nazik temizleyiciler kullanmalısınız.',
    products: ['Yoğun Nemlendirici Krem', 'Hyaluronik Asit Serumu', 'Krem Temizleyici']
  },
  karma: {
    title: 'Karma Cilt Tipine Sahipsiniz',
    desc: 'T bölgeniz (alın, burun, çene) yağlıyken yanaklarınız normal veya kuru. Dengeleyici tonikler ve hafif jel nemlendiriciler tam size göre.',
    products: ['Dengeleyici Tonik', 'Jel Nemlendirici', 'Niasinamid Serumu']
  },
  yagli: {
    title: 'Yağlı Cilt Tipine Sahipsiniz',
    desc: 'Cildiniz fazla sebum (yağ) üretiyor. Salisilik asit (BHA) içeren temizleyiciler ve su bazlı, yağsız nemlendiriciler kullanmalısınız.',
    products: ['Salisilik Asit Temizleyici', 'Yağsız Su Bazlı Nemlendirici', 'Kil Maskesi']
  },
  normal: {
    title: 'Normal Cilt Tipine Sahipsiniz',
    desc: 'Şanslısınız! Cildinizin dengesi gayet yerinde. Temel bir temizleyici, C vitamini serumu ve güneş kremi ile bu dengeyi koruyabilirsiniz.',
    products: ['Nazik Temizleme Jeli', 'C Vitamini Serumu', 'Güneş Kremi']
  }
};

const SkinAnalysisPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  const handleAnswer = (type) => {
    const newAnswers = [...answers, type];
    
    if (currentStep < questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate result
      const counts = newAnswers.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {});
      
      let maxType = 'normal';
      let maxCount = 0;
      for (const [key, value] of Object.entries(counts)) {
        if (value > maxCount) {
          maxCount = value;
          maxType = key;
        }
      }
      
      setResult(results[maxType]);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.quizWrapper}>
        {!result ? (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Cilt Analizi Testi</h1>
              <p className={styles.subtitle}>Sadece 3 soruda cilt tipinizi öğrenin ve size özel ürün önerilerini görün.</p>
            </div>
            
            <div className={styles.progressContainer}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${((currentStep) / questions.length) * 100}%` }}
              ></div>
            </div>
            <div className={styles.stepText}>Soru {currentStep + 1} / {questions.length}</div>

            <div className={styles.questionCard}>
              <h2 className={styles.questionText}>{questions[currentStep].question}</h2>
              <div className={styles.optionsList}>
                {questions[currentStep].options.map((opt, i) => (
                  <button 
                    key={i} 
                    className={styles.optionBtn}
                    onClick={() => handleAnswer(opt.type)}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.resultCard}>
            <div className={styles.resultIcon}>✨</div>
            <h1 className={styles.resultTitle}>{result.title}</h1>
            <p className={styles.resultDesc}>{result.desc}</p>
            
            <h3 className={styles.routineTitle}>Size Özel Ürün Önerileri:</h3>
            <ul className={styles.productList}>
              {result.products.map((p, i) => (
                <li key={i} className={styles.productItem}>
                  <span className={styles.checkIcon}>✓</span>
                  {p}
                </li>
              ))}
            </ul>
            
            <button className={styles.restartBtn} onClick={restart}>Testi Tekrar Çöz</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkinAnalysisPage;


