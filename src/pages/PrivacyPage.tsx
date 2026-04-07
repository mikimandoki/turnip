import ReactMarkdown from 'react-markdown';

import content from '../content/privacy.md?raw';

export default function PrivacyPage() {
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
