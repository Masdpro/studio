import { CalendarDays, ShoppingCart } from 'lucide-react-native';
import { useSide } from '@/lib/side';
import { Segmented } from './ui';

/** Shop / Book switch: flips the whole app between products and services instantly. */
export function SideSwitch() {
  const { side, setSide } = useSide();
  return (
    <Segmented
      value={side}
      onChange={setSide}
      options={[
        { value: 'shop', label: 'Shop', icon: (color) => <ShoppingCart size={16} color={color} /> },
        { value: 'book', label: 'Book', icon: (color) => <CalendarDays size={16} color={color} /> },
      ]}
    />
  );
}
