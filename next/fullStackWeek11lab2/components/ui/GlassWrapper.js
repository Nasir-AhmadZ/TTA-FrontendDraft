import styles from './GlassWrapper.module.css';

const GlassWrapper = ({ children, className = '' }) => {
  return (
    <div className={`${styles.glassWrapper} ${className}`}>
      {children}
    </div>
  );
};

export default GlassWrapper;