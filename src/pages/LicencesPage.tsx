import ReactMarkdown from 'react-markdown';

import content from '../../ATTRIBUTIONS.md?raw';
import { useForceLightMode } from '../hooks/useForceLightMode';

export default function LicencesPage() {
  useForceLightMode();
  return (
    <div className='app app-legal'>
      <div className='header header--solo'>
        <div className='header-title'>Third-Party Licences</div>
      </div>
      <div className='card'>
        <div className='legal-content'>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
