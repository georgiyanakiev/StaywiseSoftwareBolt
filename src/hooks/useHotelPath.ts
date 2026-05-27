import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function useHotelSlug(): string | undefined {
  const { slug } = useParams<{ slug: string }>();
  return slug;
}

export function useHotelPath() {
  const slug = useHotelSlug();
  const basePath = slug ? `/h/${slug}` : '';

  const hotelPath = useCallback(
    (path: string) => {
      if (!slug) return path;
      if (path === '/') return basePath;
      return `${basePath}${path}`;
    },
    [slug, basePath],
  );

  return { slug, basePath, hotelPath };
}

export function useHotelNavigate() {
  const navigate = useNavigate();
  const { hotelPath } = useHotelPath();

  return useCallback(
    (path: string) => {
      navigate(hotelPath(path));
    },
    [navigate, hotelPath],
  );
}
