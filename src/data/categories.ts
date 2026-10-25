export const taskCategories = [
  "Ev & Bakım Hizmetleri",
  "Kurye & Alışveriş",
  "Resmi İşler & Evrak",
  "Saha Analizi & Kontrol",
  "Saha Doğrulaması & Güvenlik",
  "Tadilat & Küçük Tamirat",
  "Evcil Hayvan Hizmetleri",
  "Teknoloji & Cihaz Kurulumu",
  "Taşıma & Eşya Montajı",
  "Özel Ders & Eğitim",
  "Organizasyon & Yardımcı Güç",
] as const;

export type TaskCategory = (typeof taskCategories)[number];