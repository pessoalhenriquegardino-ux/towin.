import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * O React Router não reseta o scroll ao trocar de rota (diferente de navegação
 * tradicional). Sem isso, trocar de página pela barra lateral mantém a posição
 * de scroll da página anterior, deixando o conteúdo novo cortado/deslocado.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
