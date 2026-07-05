import { passwordStrength } from '../utils/password';

const COLORS = ['#9CA3AF', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#059669'];

export default function PasswordStrengthMeter({ value }) {
  const { score, label } = passwordStrength(value);
  if (!value) return null;
  const color = COLORS[score] || COLORS[0];
  return (
    <div className="mt-2 animate-fade-in">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map((seg) => (
          <div key={seg} className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: seg <= score ? color : '#F3F4F6' }} />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
    </div>
  );
}
