import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/cyrillic-700.css';
import { Board } from './board/Board';
import './reset.css';

const root = document.getElementById('root');
if (!root) throw new Error('Корневой элемент приложения не найден');
createRoot(root).render(<Board />);
