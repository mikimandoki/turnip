import ReactMarkdown from 'react-markdown';

import content from '../content/terms.md?raw';
import { useForceLightMode } from '../hooks/useForceLightMode';

export default function TermsPage() {
  useForceLightMode();
  return (
    <div className='app app-legal'>
      <div className='header header--solo'>
        <div className='header-title'>Terms of Service</div>
      </div>
      <div className='card'>
        <div className='legal-content'>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
