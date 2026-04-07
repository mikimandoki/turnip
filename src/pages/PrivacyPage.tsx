import { ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router';

import content from '../content/privacy.md?raw';

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className='app app-legal'>
      <div className='header'>
        <button className='btn-action' onClick={() => void navigate(-1)}>
          <ChevronLeft size={16} />
        </button>
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
