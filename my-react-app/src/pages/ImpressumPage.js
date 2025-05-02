import React from 'react';
import '../styles/ImpressumPage.css';

function Impressum() {
  return (
    <div className="impressum-page">
      <h1>Impressum</h1>
      <p>
        This is a placeholder legal page. Add your legal information here, such as:
      </p>
      <ul>
        <li>Company Name</li>
        <li>Address</li>
        <li>Contact Information</li>
        <li>Legal Disclaimers</li>
      </ul>
      <p>
        For more information, please contact us at <a href="mailto:info@example.com">info@example.com</a>.
      </p>
    </div>
  );
}

export default Impressum;