"""The /api/account/ requests. Mixed into the server's request handler."""
from http.cookies import CookieError, SimpleCookie

from .store import SESSION_SECONDS, AccountError

ACTIONS = {
    "/api/account/register": "account_register",
    "/api/account/login": "account_login",
    "/api/account/logout": "account_logout",
    "/api/account/avatar": "account_avatar",
    "/api/account/buy": "account_buy",
}


class AccountRoutes:
    # Set in the server's main()
    accounts = None
    sessions = None

    def session_token(self):
        try:
            morsel = SimpleCookie(self.headers.get("Cookie", "")).get("session")
        except CookieError:
            return None
        return morsel.value if morsel else None

    @staticmethod
    def session_cookie(token, max_age):
        return f"session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={max_age}"

    def start_session(self, account_id, user, status=200):
        token = self.sessions.create(account_id)
        self.send_json({"user": user}, status, self.session_cookie(token, SESSION_SECONDS))

    def account_me(self):
        account_id = self.sessions.get(self.session_token())
        self.send_json({"user": self.accounts.get(account_id) if account_id else None})

    def account_register(self, data):
        account_id, user = self.accounts.create(data.get("name"), data.get("password"), data.get("avatar"))
        self.start_session(account_id, user, 201)

    def account_login(self, data):
        account_id, user = self.accounts.login(data.get("name"), data.get("password"))
        self.start_session(account_id, user)

    def account_logout(self, data):
        self.sessions.delete(self.session_token())
        self.send_json({"user": None}, cookie=self.session_cookie("", 0))

    def logged_in_account(self):
        """The current account id, or None after replying that a login is needed."""
        account_id = self.sessions.get(self.session_token())
        if not account_id:
            self.send_json({"error": "not_logged_in"}, 401)
        return account_id

    def account_avatar(self, data):
        account_id = self.logged_in_account()
        if account_id:
            self.send_json({"user": self.accounts.set_avatar(account_id, data.get("avatar"))})

    def account_buy(self, data):
        account_id = self.logged_in_account()
        if account_id:
            self.send_json({"user": self.accounts.buy(account_id, data.get("item"))})

    def handle_account_post(self, path):
        data = self.read_request()
        if data is None:
            return
        if not isinstance(data, dict):
            self.send_json({"error": "expected a JSON object"}, 400)
            return
        try:
            getattr(self, ACTIONS[path])(data)
        except AccountError as error:
            self.send_json({"error": str(error)}, 400)
