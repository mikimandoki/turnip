import ReactMarkdown from 'react-markdown';

import content from '../content/privacy.md?raw';
import { useForceLightMode } from '../hooks/useForceLightMode';

export default function PrivacyPage() {
  useForceLightMode();
  return (
    <div className='app app-legal'>
      <div className='header'>
        <div className='header-title header-title-centered'>Privacy Policy</div>
      </div>
      <div className='card'>
        <div className='legal-content'>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
