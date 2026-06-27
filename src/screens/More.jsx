import React from 'react';
import { Settings, Users, MessageCircle, BarChart2, ChevronRight } from 'lucide-react';

const More = () => {
  return (
    <section className="screen">
      <header className="top-bar glass">
        <h1>More</h1>
      </header>
      <div className="scroll-content">
        
        <div className="profile-card card">
          <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="profile-avatar" />
          <div className="profile-info">
            <h3>David Miller</h3>
            <p>Lead Pastor</p>
          </div>
          <button className="icon-button"><Settings size={20} /></button>
        </div>
        
        <div className="menu-list card">
          <div className="menu-item">
            <div className="menu-icon"><Users size={20} /></div>
            <span>Ministries</span>
            <ChevronRight className="chevron" size={20} />
          </div>
          <div className="menu-item">
            <div className="menu-icon"><MessageCircle size={20} /></div>
            <span>Communications</span>
            <ChevronRight className="chevron" size={20} />
          </div>
          <div className="menu-item">
            <div className="menu-icon"><BarChart2 size={20} /></div>
            <span>Reports</span>
            <ChevronRight className="chevron" size={20} />
          </div>
        </div>
        
        <div className="bottom-spacer" style={{height: 100}}></div>
      </div>
    </section>
  );
};

export default More;
