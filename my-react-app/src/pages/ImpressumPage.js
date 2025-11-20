import React from 'react';
import '../styles/ImpressumPage.css';


// some boilerplate legal text
function ImpressumPage() {
  return (
    <div className='impressum-page'>
      <h1>Legal Information</h1>
      <section>
        <h2>About This Application</h2>
        <p>
          Battleship is a multiplayer strategy game.
        </p>
      </section>

      <section>
        <h2>Contact Information</h2>
        <p>
          For inquiries, please contact us at{' '}
          <a href='mailto:doesnotexist@battleship-game.local'>doesnotexist@battleship-game.local</a>
        </p>
      </section>

      <section>
        <h2>Terms of Use</h2>
        <p>
          By using this application, you agree to comply with all applicable laws and regulations.
        </p>
      </section>

      <section>
        <h2>Privacy Notice</h2>
        <p>
          Your data is handled securely:
        </p>
        <ul>
          <li>Passwords are encrypted using bcrypt</li>
          <li>Authentication tokens are signed with JWT</li>
          <li>All communication is transmitted over secure connections</li>
        </ul>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p>
          This application is provided &quot;as is&quot; without warranties of any kind.
        </p>
      </section>
    </div>
  );
}

export default ImpressumPage;
