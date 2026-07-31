import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext';
import { api } from '../api';
import ProfileForm from '../components/profile/ProfileForm';
import ImpactStats from '../components/profile/ImpactStats';
import UserReviews from '../components/profile/UserReviews';
import SecuritySettings from '../components/profile/SecuritySettings';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [impact, setImpact] = useState(null);
  const [reviews, setReviews] = useState({ average: 0, count: 0, reviews: [] });

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      api.auth.impact().then(setImpact).catch(() => {});
      if (user.id) api.reviews.forUser(user.id).then(setReviews).catch(() => {});
    }
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-transition">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-text mb-2">{t('profile.title')}</h1>
        <p className="text-subtle">Manage your account information</p>
      </div>

      <ProfileForm />
      <ImpactStats impact={impact} />
      <UserReviews user={user} reviews={reviews} />
      <SecuritySettings />
    </div>
  );
}