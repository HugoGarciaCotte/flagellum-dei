import { useI18n } from "./I18nContext";

export const useTranslation = () => {
  const { t, locale, setLocale, allKeys } = useI18n();
  return { t, locale, setLocale, allKeys };
};
