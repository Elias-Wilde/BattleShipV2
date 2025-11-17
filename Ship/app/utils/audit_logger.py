# Audit logging module
# todo:

import logging
import json
from datetime import datetime
from typing import Optional, Dict, Any

# separate logger for audit trail
audit_logger = logging.getLogger("audit")

# Logs authentication, authorization, data access, and modifications.
class AuditLogger:
    @staticmethod
    def log_login_attempt(username: str, success: bool, ip_address: Optional[str] = None):
        """Log login attempts (both successful and failed)"""
        status = "SUCCESS" if success else "FAILED"
        audit_logger.warning(
            f"LOGIN_ATTEMPT | status={status} | username={username} | ip={ip_address}"
        )
    
    @staticmethod
    def log_account_lockout(username: str, reason: str, ip_address: Optional[str] = None):
        """Log account lockouts due to security violations"""
        audit_logger.critical(
            f"ACCOUNT_LOCKOUT | username={username} | reason={reason} | ip={ip_address}"
        )
    
    @staticmethod
    def log_password_change(user_id: int, username: str, success: bool):
        """Log password changes"""
        status = "SUCCESS" if success else "FAILED"
        audit_logger.info(
            f"PASSWORD_CHANGE | status={status} | user_id={user_id} | username={username}"
        )
    
    @staticmethod
    def log_authorization_failure(user_id: int, action: str, resource: str, reason: str):
        """Log unauthorized access attempts"""
        audit_logger.warning(
            f"AUTHZ_FAILURE | user_id={user_id} | action={action} | resource={resource} | reason={reason}"
        )
    
    @staticmethod
    def log_game_access(user_id: int, game_id: int, action: str, success: bool):
        """Log game access (create, join, view, delete)"""
        status = "SUCCESS" if success else "FAILED"
        audit_logger.info(
            f"GAME_ACCESS | status={status} | user_id={user_id} | game_id={game_id} | action={action}"
        )
    
    @staticmethod
    def log_game_action(user_id: int, game_id: int, action: str, details: Optional[Dict[str, Any]] = None):
        """Log in-game actions (attack, surrender, etc)"""
        details_str = json.dumps(details) if details else ""
        audit_logger.info(
            f"GAME_ACTION | user_id={user_id} | game_id={game_id} | action={action} | details={details_str}"
        )
    
    @staticmethod
    def log_user_modification(user_id: int, modified_user_id: int, action: str, changes: Dict[str, Any]):
        """Log user data modifications"""
        changes_str = json.dumps(changes)
        audit_logger.info(
            f"USER_MODIFICATION | user_id={user_id} | modified_user_id={modified_user_id} | action={action} | changes={changes_str}"
        )
    
    @staticmethod
    def log_security_event(event_type: str, details: Dict[str, Any], severity: str = "info", user_id: Optional[int] = None):
        """Log general security events"""
        details_str = json.dumps(details)
        log_method = getattr(audit_logger, severity.lower(), audit_logger.info)
        user_part = f" | user_id={user_id}" if user_id else ""
        log_method(
            f"SECURITY_EVENT | type={event_type} | severity={severity} | details={details_str}{user_part}"
        )
    
    @staticmethod
    def log_data_access(user_id: int, resource_type: str, resource_id: int, action: str = "READ"):
        """Log access to sensitive data"""
        audit_logger.info(
            f"DATA_ACCESS | user_id={user_id} | resource_type={resource_type} | resource_id={resource_id} | action={action}"
        )
    
    @staticmethod
    def log_privilege_change(user_id: int, modified_user_id: int, old_role: str, new_role: str):
        """Log privilege/role changes"""
        audit_logger.critical(
            f"PRIVILEGE_CHANGE | user_id={user_id} | modified_user_id={modified_user_id} | old_role={old_role} | new_role={new_role}"
        )
    
    @staticmethod
    def log_configuration_change(admin_id: int, config_key: str, old_value: str, new_value: str):
        """Log system configuration changes"""
        audit_logger.critical(
            f"CONFIG_CHANGE | admin_id={admin_id} | config_key={config_key} | old_value={old_value} | new_value={new_value}"
        )
    
    @staticmethod
    def log_authentication_attempt(
        username: str,
        success: bool,
        reason: str,
        ip_address: Optional[str] = None,
        user_id: Optional[int] = None
    ):
        """Log authentication attempts with detailed information for security monitoring"""
        status = "SUCCESS" if success else "FAILED"
        audit_logger.warning(
            f"AUTH_ATTEMPT | status={status} | username={username} | user_id={user_id} | reason={reason} | ip={ip_address} | timestamp={datetime.now().isoformat()}"
        )
