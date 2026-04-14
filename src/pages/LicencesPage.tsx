import ReactMarkdown from 'react-markdown';

import content from '../../ATTRIBUTIONS.md?raw';
import { useForceLightMode } from '../hooks/useForceLightMode';

export default function LicencesPage() {
  useForceLightMode();
  return (
    <main className='app app-legal'>
      <header className='header header--solo'>
        <h1 className='header-title'>Third-Party Licences</h1>
      </header>
      <div className='card'>
        <div className='legal-content'>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </main>
  );
}
