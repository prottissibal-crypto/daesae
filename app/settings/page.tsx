import SettingsClient from './SettingsClient';

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: '짧은 주소 설정'
};

export default function SettingsPage() {
  return <SettingsClient />;
}
