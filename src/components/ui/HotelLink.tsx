import { Link, type LinkProps } from 'react-router-dom';
import { useHotelPath } from '../../hooks/useHotelPath';

export default function HotelLink({ to, ...props }: LinkProps) {
  const { hotelPath } = useHotelPath();
  const resolvedTo = typeof to === 'string' ? hotelPath(to) : to;
  return <Link {...props} to={resolvedTo} />;
}
