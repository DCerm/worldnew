<?php
/**
 * Plugin Name: World New Community Bridge
 * Plugin URI: https://the-swep.org
 * Description: Bridges WordPress and WooCommerce into the World New Next.js community app.
 * Version: 0.2.0
 * Author: The SWeP
 * License: GPL2+
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('WorldNewCommunityBridge')) {
    class WorldNewCommunityBridge {
        const OPTION_KEY = 'worldnew_community_bridge_settings';

        public function __construct() {
            add_action('admin_menu', array($this, 'register_settings_page'));
            add_action('admin_init', array($this, 'register_settings'));
            add_action('rest_api_init', array($this, 'register_rest_routes'));
            add_action('init', array($this, 'handle_login_handoff'));
            add_action('template_redirect', array($this, 'handle_checkout_handoff'));
            add_action('template_redirect', array($this, 'capture_gift_checkout_context'));
            add_action('add_meta_boxes', array($this, 'register_music_product_metabox'));
            add_action('save_post_product', array($this, 'save_music_product_meta'), 10, 3);
            add_action('admin_menu', array($this, 'register_music_catalog_page'));

            add_shortcode('worldnew_community_button', array($this, 'render_shortcode'));
            add_shortcode('woo_music_streamer', array($this, 'render_music_streamer_shortcode'));

            add_action('admin_bar_menu', array($this, 'add_admin_bar_link'), 90);
            add_action('woocommerce_account_dashboard', array($this, 'render_account_cta'));
            add_action('woocommerce_checkout_create_order', array($this, 'attach_gift_context_to_order'), 10, 2);
            add_action('woocommerce_checkout_create_subscription', array($this, 'attach_gift_context_to_subscription'), 10, 4);
            add_action('woocommerce_thankyou', array($this, 'clear_gift_checkout_context'));
            add_action('woocommerce_thankyou', array($this, 'render_thankyou_download_panel'), 25);

            add_action('woocommerce_order_status_completed', array($this, 'handle_order_completed'));
            add_action('woocommerce_order_status_processing', array($this, 'handle_order_processing'));
            add_action('woocommerce_subscription_status_updated', array($this, 'handle_subscription_status_updated'), 10, 3);
            add_action('wp_head', array($this, 'output_worldnew_account_styles'), 100);
        }

        public function get_settings() {
            $defaults = array(
                'app_base_url'          => '',
                'internal_app_base_url' => '',
                'sso_secret'            => '',
                'sso_path'              => '/api/wordpress/sso',
                'webhook_path'          => '/api/wordpress/webhooks/woocommerce',
                'auth_api_path'         => '/wp-json/worldnew/v1/auth/login',
                'default_return_to'     => '/dashboard',
                'product_day_pass'      => '',
                'product_monthly'       => '',
                'product_annual'        => '',
            );

            $settings = get_option(self::OPTION_KEY, array());

            return wp_parse_args(is_array($settings) ? $settings : array(), $defaults);
        }

        public function register_settings_page() {
            add_options_page(
                'World New Community Bridge',
                'World New Bridge',
                'manage_options',
                'worldnew-community-bridge',
                array($this, 'render_settings_page')
            );
        }

        public function register_settings() {
            register_setting(
                'worldnew_community_bridge',
                self::OPTION_KEY,
                array($this, 'sanitize_settings')
            );

            add_settings_section(
                'worldnew_community_bridge_main',
                'Bridge Settings',
                '__return_false',
                'worldnew-community-bridge'
            );

            $fields = array(
                'app_base_url'          => 'Community app base URL',
                'internal_app_base_url' => 'Internal app base URL (optional)',
                'sso_secret'            => 'Shared secret',
                'sso_path'              => 'SSO path on app',
                'webhook_path'          => 'WooCommerce webhook path on app',
                'auth_api_path'         => 'Credential auth API path on WordPress',
                'default_return_to'     => 'Default return path',
                'product_day_pass'      => 'Day Pass product IDs',
                'product_monthly'       => 'Monthly product IDs',
                'product_annual'        => 'Annual product IDs',
            );

            foreach ($fields as $key => $label) {
                add_settings_field(
                    $key,
                    $label,
                    array($this, 'render_field'),
                    'worldnew-community-bridge',
                    'worldnew_community_bridge_main',
                    array(
                        'key'   => $key,
                        'label' => $label,
                    )
                );
            }
        }

        public function sanitize_settings($input) {
            $sanitized = array();

            $sanitized['app_base_url']          = isset($input['app_base_url'])          ? esc_url_raw(trim($input['app_base_url']))               : '';
            $sanitized['internal_app_base_url'] = isset($input['internal_app_base_url']) ? esc_url_raw(trim($input['internal_app_base_url']))      : '';
            $sanitized['sso_secret']            = isset($input['sso_secret'])            ? sanitize_text_field($input['sso_secret'])               : '';
            $sanitized['sso_path']              = isset($input['sso_path'])              ? sanitize_text_field($input['sso_path'])                 : '/api/wordpress/sso';
            $sanitized['webhook_path']          = isset($input['webhook_path'])          ? sanitize_text_field($input['webhook_path'])             : '/api/wordpress/webhooks/woocommerce';
            $sanitized['auth_api_path']         = isset($input['auth_api_path'])         ? sanitize_text_field($input['auth_api_path'])            : '/wp-json/worldnew/v1/auth/login';
            $sanitized['default_return_to']     = isset($input['default_return_to'])     ? sanitize_text_field($input['default_return_to'])        : '/dashboard';
            $sanitized['product_day_pass']      = isset($input['product_day_pass'])      ? sanitize_text_field($input['product_day_pass'])         : '';
            $sanitized['product_monthly']       = isset($input['product_monthly'])       ? sanitize_text_field($input['product_monthly'])          : '';
            $sanitized['product_annual']        = isset($input['product_annual'])        ? sanitize_text_field($input['product_annual'])           : '';

            return $sanitized;
        }

        public function register_rest_routes() {
            register_rest_route(
                'worldnew/v1',
                '/auth/login',
                array(
                    'methods'             => 'POST',
                    // Rate-limit by IP to slow credential-stuffing attacks.
                    // Full authentication happens via wp_authenticate(), so
                    // this endpoint does not bypass WordPress's own lockout
                    // plugins (e.g. Limit Login Attempts).
                    'permission_callback' => array($this, 'rest_login_permission_check'),
                    'callback'            => array($this, 'handle_rest_login'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/subscription/status',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_subscription_status'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/plans/sync',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_plan_sync'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/plans/prices',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_plan_prices'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/gift-recipient/resolve',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_gift_recipient_resolve'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/checkout/session',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_checkout_session'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/music/catalog',
                array(
                    'methods'             => 'GET',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_music_catalog'),
                )
            );
        }

        /**
         * Allow the request but apply a lightweight IP-based rate limit.
         * Returns true (allow) in all cases — actual auth failures are
         * handled inside handle_rest_login() with a 401.  Returning a
         * WP_Error here would expose a distinct HTTP code that could be
         * used to fingerprint the limiter.
         */
        public function rest_login_permission_check($request) {
            $ip  = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
            $key = 'worldnew_rl_' . md5($ip);
            $hits = (int) get_transient($key);

            if ($hits >= 10) {
                // Too many attempts — return a generic auth error so the
                // rate limit itself is not distinguishable from a bad password.
                return new WP_Error(
                    'too_many_requests',
                    'Too many login attempts. Please wait a moment and try again.',
                    array('status' => 429)
                );
            }

            set_transient($key, $hits + 1, MINUTE_IN_SECONDS);

            return true;
        }

        private function get_gift_context_from_request() {
            $email = isset($_GET['gift_recipient_email'])
                ? sanitize_email(wp_unslash($_GET['gift_recipient_email']))
                : '';
            $username = isset($_GET['gift_recipient_username'])
                ? sanitize_user(wp_unslash($_GET['gift_recipient_username']), true)
                : '';
            $wordpress_user_id = isset($_GET['gift_recipient_wordpress_user_id'])
                ? absint(wp_unslash($_GET['gift_recipient_wordpress_user_id']))
                : 0;

            if (! $email && ! $username && ! $wordpress_user_id) {
                return null;
            }

            return array(
                'email'             => $email,
                'username'          => $username,
                'wordpress_user_id' => $wordpress_user_id,
            );
        }

        private function get_gift_context_from_session() {
            if (! function_exists('WC') || ! WC()->session) {
                return null;
            }

            $context = WC()->session->get('worldnew_gift_membership');

            return is_array($context) ? $context : null;
        }

        private function set_gift_context_in_session($context) {
            if (! function_exists('WC') || ! WC()->session) {
                return;
            }

            if (! is_array($context) || empty($context['email'])) {
                WC()->session->__unset('worldnew_gift_membership');
                return;
            }

            WC()->session->set('worldnew_gift_membership', $context);
        }

        public function capture_gift_checkout_context() {
            if (! function_exists('is_checkout') || ! is_checkout()) {
                return;
            }

            $method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string) $_SERVER['REQUEST_METHOD']) : 'GET';

            if ('GET' !== $method) {
                return;
            }

            $context = $this->get_gift_context_from_request();
            $this->set_gift_context_in_session($context);
        }

        private function apply_gift_context_meta($entity, $context) {
            if (! is_object($entity) || ! method_exists($entity, 'update_meta_data') || ! is_array($context)) {
                return;
            }

            $email = ! empty($context['email']) ? sanitize_email($context['email']) : '';
            $username = ! empty($context['username']) ? sanitize_user($context['username'], true) : '';
            $wordpress_user_id = ! empty($context['wordpress_user_id']) ? absint($context['wordpress_user_id']) : 0;
            $resolved_user = null;

            if ($wordpress_user_id > 0) {
                $resolved_user = get_userdata($wordpress_user_id);
            }

            if (! $resolved_user && $email) {
                $resolved_user = get_user_by('email', $email);
            }

            if (! $resolved_user && $username) {
                $resolved_user = get_user_by('login', $username);
            }

            if ($resolved_user) {
                $wordpress_user_id = (int) $resolved_user->ID;
                $email = $resolved_user->user_email;
                $username = $resolved_user->user_login;
                $entity->update_meta_data('_worldnew_gift_recipient_display_name', $resolved_user->display_name);
            }

            if ($email) {
                $entity->update_meta_data('_worldnew_gift_recipient_email', $email);
            }

            if ($username) {
                $entity->update_meta_data('_worldnew_gift_recipient_username', $username);
            }

            if ($wordpress_user_id > 0) {
                $entity->update_meta_data('_worldnew_gift_recipient_wordpress_user_id', $wordpress_user_id);
            }

            $entity->update_meta_data('_worldnew_is_gift_membership', 'yes');
        }

        public function attach_gift_context_to_order($order, $data) {
            $context = $this->get_gift_context_from_request();

            if (! $context) {
                $context = $this->get_gift_context_from_session();
            }

            if (! $context) {
                return;
            }

            $this->apply_gift_context_meta($order, $context);
            $this->set_gift_context_in_session(null);
        }

        public function attach_gift_context_to_subscription($subscription, $posted_data, $order, $cart) {
            if (! is_object($order) || ! method_exists($order, 'get_meta')) {
                return;
            }

            $context = array(
                'email'             => (string) $order->get_meta('_worldnew_gift_recipient_email', true),
                'username'          => (string) $order->get_meta('_worldnew_gift_recipient_username', true),
                'wordpress_user_id' => absint($order->get_meta('_worldnew_gift_recipient_wordpress_user_id', true)),
            );

            if (empty($context['email']) && empty($context['username']) && empty($context['wordpress_user_id'])) {
                return;
            }

            $this->apply_gift_context_meta($subscription, $context);
        }

        public function clear_gift_checkout_context($order_id = 0) {
            $this->set_gift_context_in_session(null);
        }

        public function render_thankyou_download_panel($order_id) {
            if (! function_exists('wc_get_order')) {
                return;
            }

            $order = wc_get_order($order_id);
            if (! $order || ! method_exists($order, 'get_downloadable_items')) {
                return;
            }

            $downloads = $order->get_downloadable_items();
            ?>
            <section class="worldnew-post-order-panel">
                <h3>Your Order Is Ready</h3>
                <p>You can access your files anytime from <a href="<?php echo esc_url(wc_get_account_endpoint_url('downloads')); ?>">My Downloads</a>.</p>
                <?php if (! empty($downloads)) : ?>
                    <div class="worldnew-post-order-panel__actions">
                        <?php foreach ($downloads as $download) : ?>
                            <?php if (! empty($download['download_url'])) : ?>
                                <a class="worldnew-post-order-panel__btn" href="<?php echo esc_url($download['download_url']); ?>">
                                    Download <?php echo esc_html(isset($download['download_name']) ? (string) $download['download_name'] : 'File'); ?>
                                </a>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </section>
            <?php
        }

        public function output_worldnew_account_styles() {
            if (
                ! function_exists('is_account_page') ||
                (! is_account_page() && ! function_exists('is_order_received_page')) ||
                (! is_account_page() && ! is_order_received_page())
            ) {
                return;
            }
            ?>
            <style id="worldnew-account-polish">
                .woocommerce-account .woocommerce a,
                .woocommerce-order-received .woocommerce a { color: #F839A9 !important; }
                .woocommerce-account .woocommerce a:hover,
                .woocommerce-order-received .woocommerce a:hover { color: #F839A9 !important; }
                .woocommerce-account .woocommerce a.button,
                .woocommerce-account .woocommerce button.button,
                .woocommerce-order-received .woocommerce a.button,
                .woocommerce-order-received .woocommerce button.button {
                    text-decoration: none !important;
                    background: #F839A9 !important;
                    color: #ffffff !important;
                    border-color: #F839A9 !important;
                    font-weight: 700;
                }
                .woocommerce-account .woocommerce a.button:hover,
                .woocommerce-account .woocommerce button.button:hover,
                .woocommerce-order-received .woocommerce a.button:hover,
                .woocommerce-order-received .woocommerce button.button:hover {
                    text-decoration: none !important;
                    background: #F839A9 !important;
                    color: #ffffff !important;
                    border-color: #F839A9 !important;
                }
                .woocommerce-account .entry-content > .woocommerce,
                .woocommerce-order-received .entry-content > .woocommerce {
                    background: #f7fafc;
                    border: 1px solid #f7c4e0;
                    border-radius: 20px;
                    padding: 18px;
                    min-height: 90vh;
                }
                .woocommerce-account .woocommerce-MyAccount-navigation {
                    width: 280px;
                    margin-right: 24px;
                    padding: 14px;
                    background: #ffffff;
                    border: 1px solid #f7c4e0;
                    border-radius: 16px;
                }
                .woocommerce-account .woocommerce-MyAccount-navigation ul { list-style: none; margin: 0; padding: 0; }
                .woocommerce-account .woocommerce-MyAccount-navigation ul li { margin: 0 0 8px; }
                .woocommerce-account .woocommerce-MyAccount-navigation ul li a {
                    display: block;
                    padding: 10px 12px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: 600;
                    color: #1f2937 !important;
                }
                .woocommerce-account .woocommerce-MyAccount-navigation ul li.is-active a,
                .woocommerce-account .woocommerce-MyAccount-navigation ul li a:hover {
                    background: #fff0f8;
                    color: #F839A9 !important;
                }
                .woocommerce-account .woocommerce-MyAccount-content {
                    background: #ffffff;
                    border: 1px solid #f7c4e0;
                    border-radius: 16px;
                    padding: 18px 22px;
                    min-height: 90vh;
                }
                .woocommerce-order-received .woocommerce-order {
                    background: #ffffff;
                    border: 1px solid #f7c4e0;
                    border-radius: 16px;
                    padding: 18px 22px;
                }
                .worldnew-post-order-panel {
                    margin-top: 18px;
                    border: 1px solid #f7c4e0;
                    border-radius: 14px;
                    padding: 14px;
                    background: #fff0f8;
                }
                .worldnew-post-order-panel h3 { margin: 0 0 6px; font-size: 1.15rem; color: #0f172a; }
                .worldnew-post-order-panel p { margin: 0 0 10px; color: #334155; }
                .worldnew-post-order-panel__actions { display: flex; flex-wrap: wrap; gap: 8px; }
                .worldnew-post-order-panel__btn {
                    display: inline-block;
                    padding: 8px 12px;
                    border-radius: 999px;
                    background: #F839A9;
                    color: #fff !important;
                    text-decoration: none;
                    font-weight: 600;
                }
                .worldnew-post-order-panel__btn:hover { background: #F839A9; color: #fff !important; text-decoration: none !important; }
                .woocommerce-order-received .woocommerce .worldnew-post-order-panel a.worldnew-post-order-panel__btn,
                .woocommerce-order-received .woocommerce .worldnew-post-order-panel a.worldnew-post-order-panel__btn:hover,
                .woocommerce-order-received .woocommerce .worldnew-post-order-panel a.worldnew-post-order-panel__btn:focus {
                    color: #ffffff !important;
                    text-decoration: none !important;
                }
                @media (max-width: 900px) {
                    .woocommerce-account .woocommerce-MyAccount-navigation,
                    .woocommerce-account .woocommerce-MyAccount-content {
                        width: 100%;
                        margin-right: 0;
                    }
                    .woocommerce-account .woocommerce-MyAccount-navigation { margin-bottom: 12px; }
                }
            </style>
            <?php
        }

        private function get_gift_user_payload($entity) {
            if (! is_object($entity) || ! method_exists($entity, 'get_meta')) {
                return null;
            }

            $gift_email = sanitize_email((string) $entity->get_meta('_worldnew_gift_recipient_email', true));
            $gift_username = sanitize_user((string) $entity->get_meta('_worldnew_gift_recipient_username', true), true);
            $gift_user_id = absint($entity->get_meta('_worldnew_gift_recipient_wordpress_user_id', true));

            if (! $gift_email && ! $gift_username && ! $gift_user_id) {
                return null;
            }

            $user = null;

            if ($gift_user_id > 0) {
                $user = get_userdata($gift_user_id);
            }

            if (! $user && $gift_email) {
                $user = get_user_by('email', $gift_email);
            }

            if (! $user && $gift_username) {
                $user = get_user_by('login', $gift_username);
            }

            return array(
                'email'                 => $user ? $user->user_email : $gift_email,
                'wordpress_user_id'     => $user ? (int) $user->ID : ($gift_user_id > 0 ? $gift_user_id : null),
                'wordpress_customer_id' => $user ? $this->get_customer_id_for_user($user->ID) : null,
                'display_name'          => $user ? $user->display_name : (string) $entity->get_meta('_worldnew_gift_recipient_display_name', true),
                'first_name'            => $user ? get_user_meta($user->ID, 'first_name', true) : '',
                'last_name'             => $user ? get_user_meta($user->ID, 'last_name', true) : '',
            );
        }

        public function handle_rest_gift_recipient_resolve($request) {
            $params = $this->validate_signed_rest_request($request);

            if (is_wp_error($params)) {
                return $params;
            }

            $identifier = isset($params['identifier']) ? trim((string) $params['identifier']) : '';

            if (! $identifier) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'Missing recipient identifier.',
                ), 400);
            }

            $user = false;

            if (is_email($identifier)) {
                $user = get_user_by('email', sanitize_email($identifier));
            }

            if (! $user) {
                $user = get_user_by('login', sanitize_user($identifier, true));
            }

            if (! $user) {
                return new WP_REST_Response(array(
                    'success'   => false,
                    'recipient' => null,
                ), 200);
            }

            return new WP_REST_Response(array(
                'success'   => true,
                'recipient' => array(
                    'email'             => $user->user_email,
                    'username'          => $user->user_login,
                    'wordpress_user_id' => (int) $user->ID,
                    'display_name'      => $user->display_name,
                ),
            ), 200);
        }

        /**
         * Authenticates WordPress credentials and mints a short-lived
         * one-time token.
         *
         * The Next.js loginAction calls this endpoint from the server.  On
         * success it returns a redirect_url that points back to the WordPress
         * origin (e.g. https://example.com/?worldnew_bridge_login=TOKEN).
         *
         * IMPORTANT: the Next.js app must NOT redirect() to this URL server-
         * side.  It must return the URL to the browser so that the browser
         * navigates there directly.  Only then can WordPress set its auth
         * cookie (via wp_set_auth_cookie) on the user's browser, completing
         * the SSO handshake.
         */
        public function handle_rest_login($request) {
            $params     = $request->get_json_params();
            $identifier = isset($params['email'])     ? sanitize_text_field($params['email'])     : '';
            $password   = isset($params['password'])  ? (string) $params['password']              : '';
            $return_to  = isset($params['return_to']) ? sanitize_text_field($params['return_to']) : '';

            if (! $identifier || ! $password) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'Missing credentials.',
                ), 400);
            }

            // Resolve identifier → WP_User (accept email or username).
            $user = get_user_by('email', $identifier);

            if (! $user) {
                $user = get_user_by('login', $identifier);
            }

            // Use a constant-time comparison path so that "user not found"
            // and "wrong password" are indistinguishable to timing attacks.
            if (! $user) {
                // Fake a password check to keep timing consistent.
                wp_check_password($password, '$P$BInvalidHashXXXXXXXXXXXXXXXXX');

                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'Invalid credentials.',
                ), 401);
            }

            $authenticated_user = wp_authenticate($user->user_login, $password);

            if (is_wp_error($authenticated_user)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'Invalid credentials.',
                ), 401);
            }

            // Mint a cryptographically random one-time token (48 chars,
            // alphanumeric only).  Store it in a transient that expires in
            // 5 minutes — plenty of time for the browser to follow the
            // redirect, but short enough to limit exposure if the URL leaks.
            $token = wp_generate_password(48, false, false);

            set_transient(
                'worldnew_bridge_login_' . $token,
                array(
                    'user_id'   => (int) $authenticated_user->ID,
                    'return_to' => $return_to,
                    // Store the authenticated user's login name so
                    // handle_login_handoff() can verify the token belongs to
                    // the expected user account.
                    'user_login' => $authenticated_user->user_login,
                ),
                5 * MINUTE_IN_SECONDS
            );

            // This URL must be visited by the browser, not fetched server-
            // side.  See the note in handle_rest_login() and in the Next.js
            // loginAction for why.
            $redirect_url = add_query_arg(
                array('worldnew_bridge_login' => $token),
                home_url('/')
            );

            return new WP_REST_Response(array(
                'success'      => true,
                'redirect_url' => $redirect_url,
            ), 200);
        }

        /**
         * Handles the browser hitting /?worldnew_bridge_login=TOKEN.
         *
         * This runs on every WordPress page load (via the 'init' hook) but
         * exits immediately when the query param is absent.  When present it:
         *   1. Validates and consumes the one-time token.
         *   2. Sets the WordPress auth cookie for the user's browser.
         *   3. Builds the signed SSO payload and redirects to Next.js.
         *
         * The cookie is set HERE, in a real browser request, which is why
         * the Next.js server must not intercept this URL server-side.
         */
        public function handle_login_handoff() {
            if (empty($_GET['worldnew_bridge_login'])) {
                return;
            }

            $token   = sanitize_text_field(wp_unslash($_GET['worldnew_bridge_login']));
            $payload = get_transient('worldnew_bridge_login_' . $token);

            // Consume the token immediately — even on failure — so it cannot
            // be replayed.
            delete_transient('worldnew_bridge_login_' . $token);

            if (! $payload || empty($payload['user_id'])) {
                // Token invalid, expired, or already used.
                wp_safe_redirect(
                    add_query_arg('worldnew_error', 'session_expired', wp_login_url())
                );
                exit;
            }

            $user_id = (int) $payload['user_id'];
            $user    = get_userdata($user_id);

            // Verify the user account still exists and matches what was
            // stored in the token.
            if (
                ! $user ||
                (
                    ! empty($payload['user_login']) &&
                    $user->user_login !== $payload['user_login']
                )
            ) {
                wp_safe_redirect(
                    add_query_arg('worldnew_error', 'user_not_found', wp_login_url())
                );
                exit;
            }

            // Set WordPress auth cookie — this is the step that REQUIRES a
            // real browser request.  Next.js redirect() on the server would
            // swallow this Set-Cookie header and the user would never be
            // logged in to WordPress.
            wp_set_current_user($user_id);
            wp_set_auth_cookie($user_id, true, is_ssl());

            $return_to   = isset($payload['return_to']) ? $payload['return_to'] : '';
            $redirect_url = $this->get_sso_redirect_url($user_id, $return_to);

            if (! $redirect_url) {
                // SSO not configured — fall back to the WordPress home page.
                wp_safe_redirect(home_url('/'));
                exit;
            }

            wp_safe_redirect($redirect_url);
            exit;
        }

        public function handle_checkout_handoff() {
            if (empty($_GET['worldnew_bridge_checkout'])) {
                return;
            }

            $token   = sanitize_text_field(wp_unslash($_GET['worldnew_bridge_checkout']));
            $payload = get_transient('worldnew_bridge_checkout_' . $token);

            delete_transient('worldnew_bridge_checkout_' . $token);

            if (! $payload || empty($payload['user_id']) || empty($payload['product_id'])) {
                wp_safe_redirect(add_query_arg('worldnew_error', 'checkout_session_expired', wc_get_checkout_url()));
                exit;
            }

            $user_id = (int) $payload['user_id'];
            $user    = get_userdata($user_id);

            if (! $user) {
                wp_safe_redirect(add_query_arg('worldnew_error', 'checkout_user_missing', wp_login_url()));
                exit;
            }

            wp_set_current_user($user_id);
            wp_set_auth_cookie($user_id, true, is_ssl());

            if (! function_exists('WC') || ! WC()->cart) {
                wp_safe_redirect(wc_get_checkout_url());
                exit;
            }

            $product_id   = (int) $payload['product_id'];
            $variation_id = ! empty($payload['variation_id']) ? (int) $payload['variation_id'] : 0;

            WC()->cart->empty_cart();

            $cart_added = WC()->cart->add_to_cart(
                $product_id,
                1,
                $variation_id > 0 ? $variation_id : 0
            );

            if (! $cart_added) {
                wp_safe_redirect(add_query_arg('worldnew_error', 'checkout_cart_failed', wc_get_checkout_url()));
                exit;
            }

            $checkout_url = wc_get_checkout_url();

            if (! empty($payload['gift_context']) && is_array($payload['gift_context'])) {
                $gift_context = $payload['gift_context'];
                $checkout_args = array(
                    'gift_mode' => '1',
                );

                if (! empty($gift_context['email'])) {
                    $checkout_args['gift_recipient_email'] = sanitize_email($gift_context['email']);
                }

                if (! empty($gift_context['username'])) {
                    $checkout_args['gift_recipient_username'] = sanitize_user($gift_context['username'], true);
                }

                if (! empty($gift_context['wordpress_user_id'])) {
                    $checkout_args['gift_recipient_wordpress_user_id'] = absint($gift_context['wordpress_user_id']);
                }

                $checkout_url = add_query_arg($checkout_args, $checkout_url);
            }

            wp_safe_redirect($checkout_url);
            exit;
        }

        public function render_field($args) {
            $settings = $this->get_settings();
            $key      = $args['key'];
            $value    = isset($settings[$key]) ? $settings[$key] : '';
            $type     = $key === 'sso_secret' ? 'password' : 'text';

            printf(
                '<input type="%1$s" class="regular-text" name="%2$s[%3$s]" value="%4$s" />',
                esc_attr($type),
                esc_attr(self::OPTION_KEY),
                esc_attr($key),
                esc_attr($value)
            );

            if (in_array($key, array('product_day_pass', 'product_monthly', 'product_annual'), true)) {
                echo '<p class="description">Use comma-separated product or variation IDs that should map to this plan.</p>';
            } elseif ('internal_app_base_url' === $key) {
                echo '<p class="description">Optional. Use this when WordPress should call the app over a private network, for example <code>http://app:3000</code>, while browsers keep using the public app URL.</p>';
            }
        }

        public function render_settings_page() {
            ?>
            <div class="wrap">
                <h1>World New Community Bridge</h1>
                <p>Configure the WordPress to Next.js sign-in bridge and WooCommerce sync.</p>
                <form method="post" action="options.php">
                    <?php
                    settings_fields('worldnew_community_bridge');
                    do_settings_sections('worldnew-community-bridge');
                    submit_button();
                    ?>
                </form>
                <hr />
                <h2>Quick Notes</h2>
                <p>Install this plugin on the WordPress site, set the same shared secret used by the Next.js app, and make sure the community app URL points at the live Next.js deployment.</p>
                <p>Use the shortcode <code>[worldnew_community_button]</code> on any page where you want a "Continue to Community" button.</p>
                <h2>How the login bridge works</h2>
                <ol>
                    <li>The Next.js login form POSTs credentials to this plugin's REST endpoint (<code>/wp-json/worldnew/v1/auth/login</code>).</li>
                    <li>This plugin validates them and returns a short-lived one-time token URL on the WordPress domain.</li>
                    <li><strong>The Next.js app returns this URL to the browser</strong> — it must NOT fetch it server-side.</li>
                    <li>The browser visits the WordPress URL, which sets the auth cookie and redirects to the Next.js SSO endpoint.</li>
                    <li>The Next.js SSO endpoint verifies the HMAC-signed payload and creates a local session.</li>
                </ol>
            </div>
            <?php
        }

        public function render_shortcode($atts) {
            if (! is_user_logged_in()) {
                return '<a class="button" href="' . esc_url(wp_login_url(get_permalink())) . '">Sign in to continue</a>';
            }

            $url = $this->get_sso_redirect_url(get_current_user_id());

            if (! $url) {
                return '';
            }

            return '<a class="button button-primary" href="' . esc_url($url) . '">Continue to Community</a>';
        }

        public function add_admin_bar_link($admin_bar) {
            if (! is_user_logged_in()) {
                return;
            }

            $url = $this->get_sso_redirect_url(get_current_user_id());

            if (! $url) {
                return;
            }

            $admin_bar->add_node(array(
                'id'    => 'worldnew-community',
                'title' => 'World New Community',
                'href'  => $url,
                'meta'  => array(
                    'class' => 'worldnew-community-link',
                ),
            ));
        }

        public function render_account_cta() {
            if (! is_user_logged_in()) {
                return;
            }

            $url = $this->get_sso_redirect_url(get_current_user_id());

            $user_id = get_current_user_id();
            $user = get_userdata($user_id);
            $membership = $user ? $this->get_membership_snapshot_for_user($user) : null;
            $downloads = function_exists('wc_get_customer_available_downloads')
                ? wc_get_customer_available_downloads($user_id)
                : array();
            $orders = function_exists('wc_get_orders')
                ? wc_get_orders(array(
                    'customer_id' => $user_id,
                    'limit'       => 5,
                    'orderby'     => 'date',
                    'order'       => 'DESC',
                ))
                : array();

            $membership_label = 'Free member';
            if (is_array($membership) && ! empty($membership['plan_code'])) {
                $membership_label = ucwords(str_replace('_', ' ', (string) $membership['plan_code']));
                $status = ! empty($membership['status']) ? ucfirst((string) $membership['status']) : '';
                if ($status) {
                    $membership_label .= ' · ' . $status;
                }
            }
            ?>
            <section class="worldnew-account-dashboard">
                <style>
                    .worldnew-account-dashboard { margin: 1.5rem 0; padding: 1.2rem; border-radius: 20px; background: linear-gradient(180deg, #ffffff 0%, #fff7fb 100%); color: #0f172a; box-shadow: 0 24px 55px -35px rgba(2, 6, 23, .18); border: 1px solid #f7c4e0; }
                    .worldnew-account-dashboard * { box-sizing: border-box; }
                    .worldnew-account-dashboard__top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
                    .worldnew-account-dashboard__title { margin: 0; font-size: 1.3rem; color: #0f172a; }
                    .worldnew-account-dashboard__subtitle { margin: .35rem 0 0; color: #F839A9; font-size: .88rem; letter-spacing: .03em; text-transform: uppercase; }
                    .worldnew-account-dashboard__actions { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
                    .worldnew-account-dashboard__btn { border: 1px solid #f3add4; border-radius: 999px; padding: .55rem 1rem; color: #0f172a !important; text-decoration: none !important; font-weight: 700; font-size: .88rem; background: #fff; display: inline-flex; align-items: center; justify-content: center; line-height: 1.2; white-space: nowrap; }
                    .worldnew-account-dashboard__btn:hover { border-color: #F839A9; color: #F839A9 !important; text-decoration: none !important; }
                    .worldnew-account-dashboard__btn--primary { background: linear-gradient(135deg, #F839A9, #F839A9); border-color: transparent; color: #ffffff !important; min-width: 200px; }
                    .worldnew-account-dashboard__btn--primary:hover { color: #ffffff !important; border-color: transparent; text-decoration: none !important; filter: brightness(0.95); }
                    .woocommerce-account .woocommerce .worldnew-account-dashboard a.worldnew-account-dashboard__btn--primary,
                    .woocommerce-account .woocommerce .worldnew-account-dashboard a.worldnew-account-dashboard__btn--primary:hover,
                    .woocommerce-account .woocommerce .worldnew-account-dashboard a.worldnew-account-dashboard__btn--primary:focus { color: #ffffff !important; text-decoration: none !important; }
                    .worldnew-account-dashboard__stats { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom: 1rem; }
                    .worldnew-account-dashboard__stat { border: 1px solid #f7c4e0; border-radius: 14px; padding: .8rem; background: #fff; }
                    .worldnew-account-dashboard__kicker { display: block; color: #F839A9; font-size: .76rem; text-transform: uppercase; letter-spacing: .07em; margin-bottom: .35rem; }
                    .worldnew-account-dashboard__value { display: block; color: #0f172a; font-size: 1rem; font-weight: 700; }
                    .worldnew-account-dashboard__section-title { color: #0f172a; margin: 1rem 0 .65rem; font-size: 1rem; }
                    .worldnew-account-dashboard__table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid #f7c4e0; background: #fff; }
                    .worldnew-account-dashboard__table { width: 100%; border-collapse: collapse; min-width: 560px; }
                    .worldnew-account-dashboard__table th, .worldnew-account-dashboard__table td { padding: .72rem .8rem; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: .86rem; color: #334155; }
                    .worldnew-account-dashboard__table th { color: #F839A9; font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
                    .worldnew-account-dashboard__table tr:last-child td { border-bottom: none; }
                    .worldnew-account-dashboard__empty { margin: 0; padding: .9rem; border-radius: 12px; background: #fff7fb; border: 1px dashed #f3add4; color: #475569; }
                </style>
                <div class="worldnew-account-dashboard__top">
                    <div>
                        <h3 class="worldnew-account-dashboard__title">Your World New Hub</h3>
                        <p class="worldnew-account-dashboard__subtitle">Downloads, membership and account activity in one place</p>
                    </div>
                    <div class="worldnew-account-dashboard__actions">
                        <?php if ($url) : ?>
                            <a class="worldnew-account-dashboard__btn worldnew-account-dashboard__btn--primary" href="<?php echo esc_url($url); ?>">Open Community</a>
                        <?php endif; ?>
                        <a class="worldnew-account-dashboard__btn" href="<?php echo esc_url(wc_get_account_endpoint_url('downloads')); ?>">My Downloads</a>
                        <a class="worldnew-account-dashboard__btn" href="<?php echo esc_url(wc_get_account_endpoint_url('orders')); ?>">My Orders</a>
                    </div>
                </div>

                <div class="worldnew-account-dashboard__stats">
                    <div class="worldnew-account-dashboard__stat">
                        <span class="worldnew-account-dashboard__kicker">Membership</span>
                        <span class="worldnew-account-dashboard__value"><?php echo esc_html($membership_label); ?></span>
                    </div>
                    <div class="worldnew-account-dashboard__stat">
                        <span class="worldnew-account-dashboard__kicker">Available Downloads</span>
                        <span class="worldnew-account-dashboard__value"><?php echo esc_html((string) count($downloads)); ?></span>
                    </div>
                    <div class="worldnew-account-dashboard__stat">
                        <span class="worldnew-account-dashboard__kicker">Recent Orders</span>
                        <span class="worldnew-account-dashboard__value"><?php echo esc_html((string) count($orders)); ?></span>
                    </div>
                </div>

                <h4 class="worldnew-account-dashboard__section-title">Latest Downloads</h4>
                <?php if (empty($downloads)) : ?>
                    <p class="worldnew-account-dashboard__empty">No downloadable files yet. When you purchase tracks, your secure download links will appear here.</p>
                <?php else : ?>
                    <div class="worldnew-account-dashboard__table-wrap">
                        <table class="worldnew-account-dashboard__table">
                            <thead>
                                <tr>
                                    <th>Track</th>
                                    <th>Order</th>
                                    <th>Remaining</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach (array_slice($downloads, 0, 8) as $download) : ?>
                                    <tr>
                                        <td><?php echo esc_html(isset($download['download_name']) ? (string) $download['download_name'] : 'Download'); ?></td>
                                        <td>#<?php echo esc_html(isset($download['order_id']) ? (string) $download['order_id'] : '-'); ?></td>
                                        <td><?php echo esc_html(isset($download['downloads_remaining']) ? (string) $download['downloads_remaining'] : '—'); ?></td>
                                        <td>
                                            <?php if (! empty($download['download_url'])) : ?>
                                                <a class="worldnew-account-dashboard__btn" href="<?php echo esc_url($download['download_url']); ?>">Download</a>
                                            <?php else : ?>
                                                —
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </section>
            <?php
        }

        private function get_app_endpoint($path, $use_internal_base = false) {
            $settings  = $this->get_settings();
            $base_url  = isset($settings['app_base_url']) ? untrailingslashit($settings['app_base_url']) : '';
            $internal_base_url = isset($settings['internal_app_base_url']) ? untrailingslashit($settings['internal_app_base_url']) : '';
            $clean_path = '/' . ltrim($path, '/');

            if ($use_internal_base && $internal_base_url) {
                return $internal_base_url . $clean_path;
            }

            if (! $base_url) {
                return '';
            }

            return $base_url . $clean_path;
        }

        private function base64url_encode($value) {
            return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        }

        /**
         * Signs $json with HMAC-SHA256 using the configured shared secret.
         *
         * The Next.js SSO endpoint must verify this signature using the same
         * secret before trusting any field in the payload.  Use
         * hash_equals() (constant-time) on the Next.js side to prevent
         * timing attacks.
         */
        private function sign_payload($json) {
            $settings = $this->get_settings();

            if (empty($settings['sso_secret'])) {
                return '';
            }

            return hash_hmac('sha256', $json, $settings['sso_secret']);
        }

        private function get_user_roles($user) {
            $roles = array('member');

            if (! empty($user->roles) && is_array($user->roles)) {
                foreach ($user->roles as $role) {
                    if ('administrator' === $role) {
                        $roles[] = 'super_admin';
                    }

                    if (false !== strpos($role, 'artist')) {
                        $roles[] = 'artist_admin';
                    }
                }
            }

            return array_values(array_unique($roles));
        }

        private function generate_unique_username($base) {
            $candidate = sanitize_user($base, true);

            if (! $candidate) {
                $candidate = 'worldnewuser';
            }

            $original = $candidate;
            $suffix   = 1;

            while (username_exists($candidate)) {
                $candidate = $original . $suffix;
                $suffix++;
            }

            return $candidate;
        }

        private function resolve_or_create_checkout_user($email, $display_name = '', $username_hint = '') {
            $email = sanitize_email($email);

            if (! $email || ! is_email($email)) {
                return new WP_Error(
                    'invalid_email',
                    'A valid email address is required for checkout.',
                    array('status' => 400)
                );
            }

            $user = get_user_by('email', $email);

            if ($user) {
                return $user;
            }

            if ($username_hint) {
                $base_username = sanitize_user($username_hint, true);
            } else {
                $email_parts = explode('@', $email);
                $base_username = sanitize_user($email_parts[0], true);
            }

            $username = $this->generate_unique_username($base_username);
            $password = wp_generate_password(24, true, true);
            $user_id  = wp_create_user($username, $password, $email);

            if (is_wp_error($user_id)) {
                return $user_id;
            }

            if ($display_name) {
                wp_update_user(
                    array(
                        'ID'           => $user_id,
                        'display_name' => sanitize_text_field($display_name),
                    )
                );
            }

            return get_userdata($user_id);
        }

        /**
         * Builds the signed SSO redirect URL for a given WordPress user.
         *
         * The URL points to the Next.js /api/wordpress/sso endpoint and
         * carries the user payload as a base64url-encoded JSON blob plus an
         * HMAC-SHA256 signature.  The Next.js endpoint MUST:
         *   1. Decode the payload.
         *   2. Recompute HMAC-SHA256(payload_json, shared_secret).
         *   3. Compare with hash_equals / timingSafeEqual to prevent timing attacks.
         *   4. Only then trust and act on the payload contents.
         *
         * A timestamp ('iat') is included so the Next.js endpoint can reject
         * payloads that are replayed after a reasonable window (e.g. 5 min).
         */
        public function get_sso_redirect_url($user_id, $return_to = '') {
            $settings = $this->get_settings();
            $endpoint = $this->get_app_endpoint($settings['sso_path']);

            if (! $endpoint || empty($settings['sso_secret'])) {
                return '';
            }

            $user = get_userdata($user_id);

            if (! $user) {
                return '';
            }

            $payload = array(
                'iat'                    => time(), // issued-at — lets Next.js reject stale replays
                'email'                  => $user->user_email,
                'wordpress_user_id'      => (int) $user->ID,
                'wordpress_customer_id'  => $this->get_customer_id_for_user($user->ID),
                'display_name'           => $user->display_name,
                'first_name'             => get_user_meta($user->ID, 'first_name', true),
                'last_name'              => get_user_meta($user->ID, 'last_name', true),
                'avatar_url'             => get_avatar_url($user->ID),
                'cover_image_url'        => '',
                'bio'                    => get_user_meta($user->ID, 'description', true),
                'roles'                  => $this->get_user_roles($user),
                'return_to'              => $return_to ? $return_to : $settings['default_return_to'],
            );

            $json      = wp_json_encode($payload);
            $signature = $this->sign_payload($json);

            if (! $signature) {
                return '';
            }

            return add_query_arg(
                array(
                    'payload'   => $this->base64url_encode($json),
                    'signature' => $signature,
                ),
                $endpoint
            );
        }

        private function get_customer_id_for_user($user_id) {
            if (function_exists('wc_get_customer_id_by_user_id')) {
                return (int) wc_get_customer_id_by_user_id($user_id);
            }

            return (int) $user_id;
        }

        private function parse_product_ids($value) {
            if (! $value) {
                return array();
            }

            $parts = array_map('trim', explode(',', $value));
            $parts = array_filter($parts, function ($part) {
                return '' !== $part && is_numeric($part);
            });

            return array_map('intval', $parts);
        }

        private function plan_code_for_product_ids($product_id, $variation_id = 0) {
            $settings = $this->get_settings();
            $map      = array(
                'day_pass' => $this->parse_product_ids($settings['product_day_pass']),
                'monthly'  => $this->parse_product_ids($settings['product_monthly']),
                'annual'   => $this->parse_product_ids($settings['product_annual']),
            );

            foreach ($map as $plan_code => $ids) {
                if (
                    in_array((int) $product_id, $ids, true) ||
                    ($variation_id && in_array((int) $variation_id, $ids, true))
                ) {
                    return $plan_code;
                }
            }

            return '';
        }

        /**
         * Signs and POSTs a JSON payload to a Next.js webhook endpoint.
         *
         * The signature is sent as the x-worldnew-signature request header.
         * The Next.js webhook handler must verify this before processing the
         * event — use timingSafeEqual / hash_equals to compare.
         */
        private function send_signed_json($path, $payload) {
            $settings  = $this->get_settings();
            $endpoint  = $this->get_app_endpoint($path, true);

            if (! $endpoint || empty($settings['sso_secret'])) {
                return false;
            }

            $body      = wp_json_encode($payload);
            $signature = $this->sign_payload($body);

            $response = wp_remote_post(
                $endpoint,
                array(
                    'timeout' => 20,
                    'headers' => array(
                        'Content-Type'           => 'application/json',
                        'x-worldnew-signature'   => $signature,
                    ),
                    'body' => $body,
                )
            );

            if (is_wp_error($response)) {
                error_log('World New bridge request failed: ' . $response->get_error_message());
                return false;
            }

            $code = wp_remote_retrieve_response_code($response);

            if ($code < 200 || $code >= 300) {
                error_log(
                    sprintf(
                        'World New bridge webhook to %s returned HTTP %d: %s',
                        $endpoint,
                        $code,
                        wp_remote_retrieve_body($response)
                    )
                );
                return false;
            }

            return true;
        }

        private function get_first_matching_plan_from_order($order) {
            foreach ($order->get_items() as $item) {
                $product_id   = (int) $item->get_product_id();
                $variation_id = (int) $item->get_variation_id();
                $plan_code    = $this->plan_code_for_product_ids($product_id, $variation_id);

                if ($plan_code) {
                    return $plan_code;
                }
            }

            return '';
        }

        private function build_user_payload_from_order($order) {
            $gift_user = $this->get_gift_user_payload($order);

            if ($gift_user && ! empty($gift_user['email'])) {
                return $gift_user;
            }

            $user_id = (int) $order->get_user_id();
            $user    = $user_id ? get_userdata($user_id) : null;

            return array(
                'email'                  => $order->get_billing_email(),
                'wordpress_user_id'      => $user ? (int) $user->ID : null,
                'wordpress_customer_id'  => $user ? $this->get_customer_id_for_user($user->ID) : null,
                'display_name'           => $user
                                                ? $user->display_name
                                                : trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                'first_name'             => $order->get_billing_first_name(),
                'last_name'              => $order->get_billing_last_name(),
            );
        }

        public function handle_order_completed($order_id) {
            $this->send_order_event($order_id, 'order.completed', 'active');
        }

        public function handle_order_processing($order_id) {
            $this->send_order_event($order_id, 'order.processing', 'active');
        }

        private function send_order_event($order_id, $event_name, $status) {
            if (! function_exists('wc_get_order')) {
                return;
            }

            $order = wc_get_order($order_id);

            if (! $order) {
                return;
            }

            $plan_code = $this->get_first_matching_plan_from_order($order);

            if (! $plan_code) {
                return;
            }

            $payload = array(
                'event'           => $event_name,
                'order_id'        => $order->get_id(),
                'subscription_id' => null,
                'user'            => $this->build_user_payload_from_order($order),
                'membership'      => array(
                    'plan_code'  => $plan_code,
                    'status'     => $status,
                    'starts_at'  => gmdate('c'),
                    'ends_at'    => null,
                    'auto_renews' => false,
                    'amount'     => (float) $order->get_total(),
                    'currency'   => $order->get_currency(),
                ),
            );

            $settings = $this->get_settings();
            $this->send_signed_json($settings['webhook_path'], $payload);
        }

        public function handle_subscription_status_updated($subscription, $new_status, $old_status) {
            if (! is_object($subscription) || ! method_exists($subscription, 'get_id')) {
                return;
            }

            $plan_code = '';

            foreach ($subscription->get_items() as $item) {
                $plan_code = $this->plan_code_for_product_ids(
                    (int) $item->get_product_id(),
                    (int) $item->get_variation_id()
                );

                if ($plan_code) {
                    break;
                }
            }

            if (! $plan_code) {
                return;
            }

            $gift_user = $this->get_gift_user_payload($subscription);
            $user_id = method_exists($subscription, 'get_user_id') ? (int) $subscription->get_user_id() : 0;
            $user    = $user_id ? get_userdata($user_id) : null;

            $payload = array(
                'event'           => 'subscription.updated',
                'order_id'        => method_exists($subscription, 'get_parent_id') ? $subscription->get_parent_id() : null,
                'subscription_id' => $subscription->get_id(),
                'user'            => $gift_user
                    ? $gift_user
                    : array(
                        'email'                 => $user ? $user->user_email : '',
                        'wordpress_user_id'     => $user ? (int) $user->ID : null,
                        'wordpress_customer_id' => $user ? $this->get_customer_id_for_user($user->ID) : null,
                        'display_name'          => $user ? $user->display_name : '',
                        'first_name'            => $user ? get_user_meta($user->ID, 'first_name', true) : '',
                        'last_name'             => $user ? get_user_meta($user->ID, 'last_name', true) : '',
                    ),
                'membership'      => array(
                    'plan_code'  => $plan_code,
                    'status'     => $new_status,
                    'starts_at'  => method_exists($subscription, 'get_date') ? $subscription->get_date('start') : null,
                    'ends_at'    => method_exists($subscription, 'get_date') ? $subscription->get_date('end') : null,
                    'auto_renews' => 'cancelled' !== $new_status,
                    'amount'     => method_exists($subscription, 'get_total') ? (float) $subscription->get_total() : null,
                    'currency'   => method_exists($subscription, 'get_currency') ? $subscription->get_currency() : 'GBP',
                ),
                'meta'            => array(
                    'old_status' => $old_status,
                ),
            );

            $settings = $this->get_settings();
            $this->send_signed_json($settings['webhook_path'], $payload);
        }

        private function verify_signed_body($raw_body, $received_signature) {
            if (! $raw_body || ! $received_signature) {
                return false;
            }

            $expected_hex = $this->sign_payload($raw_body);

            if (! $expected_hex) {
                return false;
            }

            $received = trim((string) $received_signature);
            $expected_base64 = base64_encode(hex2bin($expected_hex));

            return (
                (strlen($expected_hex) === strlen($received) && hash_equals($expected_hex, $received)) ||
                (strlen($expected_base64) === strlen($received) && hash_equals($expected_base64, $received))
            );
        }

        private function validate_signed_rest_request($request) {
            $raw_body = $request->get_body();
            $signature =
                $request->get_header('x-worldnew-signature')
                ? $request->get_header('x-worldnew-signature')
                : $request->get_header('x_wordnew_signature');

            if (! $this->verify_signed_body($raw_body, $signature)) {
                return new WP_Error(
                    'invalid_signature',
                    'Invalid signature.',
                    array('status' => 401)
                );
            }

            $params = $request->get_json_params();
            $timestamp = isset($params['timestamp']) ? (int) $params['timestamp'] : 0;

            if (
                ! $timestamp ||
                abs(time() - $timestamp) > (5 * MINUTE_IN_SECONDS)
            ) {
                return new WP_Error(
                    'stale_request',
                    'Request timestamp is invalid or expired.',
                    array('status' => 401)
                );
            }

            return is_array($params) ? $params : array();
        }

        private function normalize_subscription_status($status) {
            $normalized = strtolower((string) $status);

            if (in_array($normalized, array('active', 'trialing', 'cancelled', 'expired', 'past_due', 'pending', 'refunded'), true)) {
                return $normalized;
            }

            // WooCommerce Subscriptions native statuses.
            if ('on-hold' === $normalized) {
                return 'past_due';
            }

            if ('pending-cancel' === $normalized) {
                return 'cancelled';
            }

            if ('pending' === $normalized) {
                return 'pending';
            }

            return 'active';
        }

        private function default_duration_days_for_plan($plan_code) {
            switch ($plan_code) {
                case 'day_pass':
                    return 1;
                case 'annual':
                    return 365;
                case 'monthly':
                default:
                    return 30;
            }
        }

        private function membership_snapshot_from_subscriptions($user_id) {
            if (! function_exists('wcs_get_users_subscriptions')) {
                return null;
            }

            $subscriptions = wcs_get_users_subscriptions($user_id);

            if (! is_array($subscriptions) || empty($subscriptions)) {
                return null;
            }

            $candidates = array();

            foreach ($subscriptions as $subscription) {
                if (! is_object($subscription) || ! method_exists($subscription, 'get_items')) {
                    continue;
                }

                $plan_code = '';

                foreach ($subscription->get_items() as $item) {
                    $plan_code = $this->plan_code_for_product_ids(
                        (int) $item->get_product_id(),
                        (int) $item->get_variation_id()
                    );

                    if ($plan_code) {
                        break;
                    }
                }

                if (! $plan_code) {
                    continue;
                }

                $raw_status = method_exists($subscription, 'get_status')
                    ? (string) $subscription->get_status()
                    : 'active';

                $starts_at = method_exists($subscription, 'get_date')
                    ? $subscription->get_date('start')
                    : null;
                $ends_at = method_exists($subscription, 'get_date')
                    ? $subscription->get_date('end')
                    : null;

                $candidates[] = array(
                    'plan_code'       => $plan_code,
                    'status'          => $this->normalize_subscription_status($raw_status),
                    'starts_at'       => $starts_at ? gmdate('c', strtotime($starts_at)) : null,
                    'ends_at'         => $ends_at ? gmdate('c', strtotime($ends_at)) : null,
                    'auto_renews'     => ! in_array($raw_status, array('cancelled', 'expired', 'pending-cancel'), true),
                    'amount'          => method_exists($subscription, 'get_total') ? (float) $subscription->get_total() : null,
                    'currency'        => method_exists($subscription, 'get_currency') ? $subscription->get_currency() : 'GBP',
                    'order_id'        => method_exists($subscription, 'get_parent_id') ? $subscription->get_parent_id() : null,
                    'subscription_id' => method_exists($subscription, 'get_id') ? $subscription->get_id() : null,
                );
            }

            if (empty($candidates)) {
                return null;
            }

            usort($candidates, function ($left, $right) {
                $left_score = in_array($left['status'], array('active', 'trialing', 'past_due', 'pending'), true) ? 1 : 0;
                $right_score = in_array($right['status'], array('active', 'trialing', 'past_due', 'pending'), true) ? 1 : 0;

                if ($left_score !== $right_score) {
                    return $right_score - $left_score;
                }

                $left_start = ! empty($left['starts_at']) ? strtotime($left['starts_at']) : 0;
                $right_start = ! empty($right['starts_at']) ? strtotime($right['starts_at']) : 0;

                if ($left_start === $right_start) {
                    return 0;
                }

                return ($left_start < $right_start) ? 1 : -1;
            });

            return $candidates[0];
        }

        private function membership_snapshot_from_orders($user) {
            if (! function_exists('wc_get_orders') || ! is_object($user)) {
                return null;
            }

            $orders = wc_get_orders(array(
                'customer_id' => (int) $user->ID,
                'limit'       => 20,
                'status'      => array('wc-completed', 'wc-processing'),
                'orderby'     => 'date',
                'order'       => 'DESC',
            ));

            if (! is_array($orders) || empty($orders)) {
                return null;
            }

            foreach ($orders as $order) {
                if (! is_object($order) || ! method_exists($order, 'get_items')) {
                    continue;
                }

                $plan_code = $this->get_first_matching_plan_from_order($order);

                if (! $plan_code) {
                    continue;
                }

                $paid_date = method_exists($order, 'get_date_paid') ? $order->get_date_paid() : null;
                $created_date = method_exists($order, 'get_date_created') ? $order->get_date_created() : null;

                $start_ts = null;
                if ($paid_date) {
                    $start_ts = $paid_date->getTimestamp();
                } elseif ($created_date) {
                    $start_ts = $created_date->getTimestamp();
                } else {
                    $start_ts = time();
                }

                $duration_days = $this->default_duration_days_for_plan($plan_code);
                $end_ts = $start_ts + ($duration_days * DAY_IN_SECONDS);
                $status = (time() < $end_ts) ? 'active' : 'expired';

                return array(
                    'plan_code'       => $plan_code,
                    'status'          => $status,
                    'starts_at'       => gmdate('c', $start_ts),
                    'ends_at'         => gmdate('c', $end_ts),
                    'auto_renews'     => false,
                    'amount'          => method_exists($order, 'get_total') ? (float) $order->get_total() : null,
                    'currency'        => method_exists($order, 'get_currency') ? $order->get_currency() : 'GBP',
                    'order_id'        => method_exists($order, 'get_id') ? $order->get_id() : null,
                    'subscription_id' => null,
                );
            }

            return null;
        }

        private function get_membership_snapshot_for_user($user) {
            if (! is_object($user)) {
                return null;
            }

            $subscription_snapshot = $this->membership_snapshot_from_subscriptions((int) $user->ID);

            if ($subscription_snapshot) {
                return $subscription_snapshot;
            }

            return $this->membership_snapshot_from_orders($user);
        }

        public function handle_rest_subscription_status($request) {
            $validated = $this->validate_signed_rest_request($request);

            if (is_wp_error($validated)) {
                return $validated;
            }

            $email = isset($validated['email']) ? sanitize_email($validated['email']) : '';
            $wordpress_user_id = isset($validated['wordpress_user_id']) ? (int) $validated['wordpress_user_id'] : 0;
            $wordpress_customer_id = isset($validated['wordpress_customer_id']) ? (int) $validated['wordpress_customer_id'] : 0;

            $user = null;

            if ($wordpress_user_id > 0) {
                $user = get_userdata($wordpress_user_id);
            }

            if (! $user && $email) {
                $user = get_user_by('email', $email);
            }

            if (! $user && $wordpress_customer_id > 0) {
                $user = get_userdata($wordpress_customer_id);
            }

            if (! $user) {
                return new WP_REST_Response(array(
                    'success'    => true,
                    'membership' => null,
                ), 200);
            }

            $membership = $this->get_membership_snapshot_for_user($user);

            return new WP_REST_Response(array(
                'success' => true,
                'user'    => array(
                    'email'                 => $user->user_email,
                    'wordpress_user_id'     => (int) $user->ID,
                    'wordpress_customer_id' => $this->get_customer_id_for_user($user->ID),
                ),
                'membership' => $membership,
            ), 200);
        }

        private function update_wc_price_fields($post_id, $price_string) {
            if (! $post_id || '' === $price_string) {
                return;
            }

            update_post_meta($post_id, '_regular_price', $price_string);
            update_post_meta($post_id, '_price', $price_string);
            update_post_meta($post_id, '_subscription_price', $price_string);

            if (function_exists('wc_delete_product_transients')) {
                wc_delete_product_transients((int) $post_id);
            }
        }

        private function get_wc_product_price_snapshot($product_id, $variation_id = 0) {
            if (! function_exists('wc_get_product')) {
                return null;
            }

            $target_id = $variation_id > 0 ? $variation_id : $product_id;
            $product = wc_get_product($target_id);

            if (! $product) {
                return null;
            }

            $price = $product->get_price();
            $regular_price = method_exists($product, 'get_regular_price')
                ? $product->get_regular_price()
                : $price;

            return array(
                'product_id'       => (int) $product_id,
                'variation_id'     => $variation_id > 0 ? (int) $variation_id : null,
                'resolved_id'      => (int) $target_id,
                'price_amount'     => '' !== (string) $price ? number_format((float) $price, 2, '.', '') : null,
                'regular_price'    => '' !== (string) $regular_price ? number_format((float) $regular_price, 2, '.', '') : null,
                'currency'         => function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : 'GBP',
                'product_name'     => $product->get_name(),
                'product_status'   => method_exists($product, 'get_status') ? $product->get_status() : 'publish',
            );
        }

        public function handle_rest_plan_sync($request) {
            $validated = $this->validate_signed_rest_request($request);

            if (is_wp_error($validated)) {
                return $validated;
            }

            $plan_code = isset($validated['plan_code']) ? sanitize_text_field($validated['plan_code']) : '';
            $price_amount = isset($validated['price_amount']) ? (string) $validated['price_amount'] : '';
            $product_id = isset($validated['product_id']) ? (int) $validated['product_id'] : 0;
            $variation_id = isset($validated['variation_id']) ? (int) $validated['variation_id'] : 0;

            if (! $plan_code || $product_id < 1) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'Missing plan_code or product_id.',
                ), 400);
            }

            if (! is_numeric($price_amount)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'price_amount must be numeric.',
                ), 400);
            }

            $normalized_price = number_format((float) $price_amount, 2, '.', '');

            if (function_exists('wc_get_product')) {
                $target_id = $variation_id > 0 ? $variation_id : $product_id;
                $product = wc_get_product($target_id);

                if ($product && method_exists($product, 'set_regular_price')) {
                    $product->set_regular_price($normalized_price);

                    if (method_exists($product, 'set_price')) {
                        $product->set_price($normalized_price);
                    }

                    if (method_exists($product, 'save')) {
                        $product->save();
                    }
                }
            }

            $this->update_wc_price_fields($product_id, $normalized_price);

            if ($variation_id > 0) {
                $this->update_wc_price_fields($variation_id, $normalized_price);
            }

            return new WP_REST_Response(array(
                'success'              => true,
                'plan_code'            => $plan_code,
                'price_amount'         => $normalized_price,
                'updated_product_id'   => $product_id,
                'updated_variation_id' => $variation_id > 0 ? $variation_id : null,
            ), 200);
        }

        public function handle_rest_plan_prices($request) {
            $validated = $this->validate_signed_rest_request($request);

            if (is_wp_error($validated)) {
                return $validated;
            }

            $plans = isset($validated['plans']) && is_array($validated['plans'])
                ? $validated['plans']
                : array();

            if (empty($plans)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'No plans were provided.',
                ), 400);
            }

            $result = array();

            foreach ($plans as $plan) {
                if (! is_array($plan)) {
                    continue;
                }

                $plan_code = isset($plan['plan_code']) ? sanitize_text_field($plan['plan_code']) : '';
                $product_id = isset($plan['product_id']) ? (int) $plan['product_id'] : 0;
                $variation_id = isset($plan['variation_id']) ? (int) $plan['variation_id'] : 0;

                if (! $plan_code || $product_id < 1) {
                    continue;
                }

                $snapshot = $this->get_wc_product_price_snapshot($product_id, $variation_id);

                $result[] = array(
                    'plan_code'   => $plan_code,
                    'price'       => $snapshot,
                );
            }

            return new WP_REST_Response(array(
                'success' => true,
                'plans'   => $result,
            ), 200);
        }

        public function handle_rest_checkout_session($request) {
            $validated = $this->validate_signed_rest_request($request);

            if (is_wp_error($validated)) {
                return $validated;
            }

            $email        = isset($validated['email']) ? sanitize_email($validated['email']) : '';
            $display_name = isset($validated['display_name']) ? sanitize_text_field($validated['display_name']) : '';
            $username     = isset($validated['username']) ? sanitize_user($validated['username'], true) : '';
            $product_id   = isset($validated['product_id']) ? (int) $validated['product_id'] : 0;
            $variation_id = isset($validated['variation_id']) ? (int) $validated['variation_id'] : 0;
            $gift_context = isset($validated['gift_recipient']) && is_array($validated['gift_recipient'])
                ? $validated['gift_recipient']
                : null;

            if (! $email || $product_id < 1) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => 'Missing email or product_id.',
                ), 400);
            }

            $user = $this->resolve_or_create_checkout_user($email, $display_name, $username);

            if (is_wp_error($user) || ! $user) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => is_wp_error($user) ? $user->get_error_message() : 'Unable to prepare checkout user.',
                ), 400);
            }

            $token = wp_generate_password(48, false, false);

            set_transient(
                'worldnew_bridge_checkout_' . $token,
                array(
                    'user_id'      => (int) $user->ID,
                    'product_id'   => $product_id,
                    'variation_id' => $variation_id > 0 ? $variation_id : 0,
                    'gift_context' => $gift_context,
                ),
                5 * MINUTE_IN_SECONDS
            );

            $redirect_url = add_query_arg(
                array('worldnew_bridge_checkout' => $token),
                home_url('/')
            );

            return new WP_REST_Response(array(
                'success'             => true,
                'redirect_url'        => $redirect_url,
                'wordpress_user_id'   => (int) $user->ID,
                'wordpress_customer_id' => $this->get_customer_id_for_user($user->ID),
            ), 200);
        }

        public function register_music_product_metabox() {
            if (! post_type_exists('product')) {
                return;
            }

            add_meta_box(
                'worldnew_music_product_meta',
                'World New Music Track',
                array($this, 'render_music_product_metabox'),
                'product',
                'normal',
                'default'
            );
        }

        public function render_music_product_metabox($post) {
            wp_nonce_field('worldnew_music_product_meta', 'worldnew_music_product_meta_nonce');

            $is_music = get_post_meta($post->ID, '_worldnew_music_enabled', true) === 'yes';
            $is_featured = get_post_meta($post->ID, '_worldnew_music_featured', true) === 'yes';
            $stream_url = get_post_meta($post->ID, '_worldnew_music_stream_url', true);
            $cover_url = get_post_meta($post->ID, '_worldnew_music_cover_url', true);
            $artist = get_post_meta($post->ID, '_worldnew_music_artist', true);
            $genre = get_post_meta($post->ID, '_worldnew_music_genre', true);
            $duration = get_post_meta($post->ID, '_worldnew_music_duration', true);
            $preview_seconds = (int) get_post_meta($post->ID, '_worldnew_music_preview_seconds', true);
            ?>
            <p>
                <label>
                    <input type="checkbox" name="worldnew_music_enabled" value="yes" <?php checked($is_music); ?> />
                    Mark this WooCommerce product as a music track.
                </label>
            </p>
            <p>
                <label>
                    <input type="checkbox" name="worldnew_music_featured" value="yes" <?php checked($is_featured); ?> />
                    Feature this track in the player.
                </label>
            </p>
            <p>
                <label for="worldnew_music_stream_url"><strong>Stream URL</strong></label><br />
                <input
                    type="url"
                    id="worldnew_music_stream_url"
                    name="worldnew_music_stream_url"
                    value="<?php echo esc_attr($stream_url); ?>"
                    class="widefat"
                    placeholder="https://..."
                />
            </p>
            <p>
                <label for="worldnew_music_cover_url"><strong>Cover Image URL</strong></label><br />
                <input
                    type="url"
                    id="worldnew_music_cover_url"
                    name="worldnew_music_cover_url"
                    value="<?php echo esc_attr($cover_url); ?>"
                    class="widefat"
                    placeholder="https://..."
                />
            </p>
            <p>
                <label for="worldnew_music_artist"><strong>Artist</strong></label><br />
                <input
                    type="text"
                    id="worldnew_music_artist"
                    name="worldnew_music_artist"
                    value="<?php echo esc_attr($artist); ?>"
                    class="widefat"
                    placeholder="Artist name"
                />
            </p>
            <p>
                <label for="worldnew_music_genre"><strong>Genre</strong></label><br />
                <input
                    type="text"
                    id="worldnew_music_genre"
                    name="worldnew_music_genre"
                    value="<?php echo esc_attr($genre); ?>"
                    class="widefat"
                    placeholder="Genre"
                />
            </p>
            <p>
                <label for="worldnew_music_duration"><strong>Duration</strong> (optional text, e.g. 3:45)</label><br />
                <input
                    type="text"
                    id="worldnew_music_duration"
                    name="worldnew_music_duration"
                    value="<?php echo esc_attr($duration); ?>"
                    class="widefat"
                    placeholder="3:45"
                />
            </p>
            <p>
                <label for="worldnew_music_preview_seconds"><strong>Preview seconds</strong> (auto-stop preview limit)</label><br />
                <input
                    type="number"
                    min="5"
                    max="600"
                    id="worldnew_music_preview_seconds"
                    name="worldnew_music_preview_seconds"
                    value="<?php echo esc_attr($preview_seconds > 0 ? $preview_seconds : 30); ?>"
                    class="widefat"
                    placeholder="30"
                />
            </p>
            <?php
        }

        public function save_music_product_meta($post_id, $post, $update) {
            if (! isset($_POST['worldnew_music_product_meta_nonce'])) {
                return;
            }

            if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['worldnew_music_product_meta_nonce'])), 'worldnew_music_product_meta')) {
                return;
            }

            if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
                return;
            }

            if (! current_user_can('edit_post', $post_id)) {
                return;
            }

            $is_music = isset($_POST['worldnew_music_enabled']) ? 'yes' : 'no';
            $is_featured = isset($_POST['worldnew_music_featured']) ? 'yes' : 'no';
            $stream_url = isset($_POST['worldnew_music_stream_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_music_stream_url'])) : '';
            $cover_url = isset($_POST['worldnew_music_cover_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_music_cover_url'])) : '';
            $artist = isset($_POST['worldnew_music_artist']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_artist'])) : '';
            $genre = isset($_POST['worldnew_music_genre']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_genre'])) : '';
            $duration = isset($_POST['worldnew_music_duration']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_duration'])) : '';
            $preview_seconds = isset($_POST['worldnew_music_preview_seconds']) ? (int) wp_unslash($_POST['worldnew_music_preview_seconds']) : 30;
            $preview_seconds = max(5, min(600, $preview_seconds));

            update_post_meta($post_id, '_worldnew_music_enabled', $is_music);
            update_post_meta($post_id, '_worldnew_music_featured', $is_featured);
            update_post_meta($post_id, '_worldnew_music_stream_url', $stream_url);
            update_post_meta($post_id, '_worldnew_music_cover_url', $cover_url);
            update_post_meta($post_id, '_worldnew_music_artist', $artist);
            update_post_meta($post_id, '_worldnew_music_genre', $genre);
            update_post_meta($post_id, '_worldnew_music_duration', $duration);
            update_post_meta($post_id, '_worldnew_music_preview_seconds', $preview_seconds);
        }

        public function register_music_catalog_page() {
            $parent_slug = post_type_exists('product') ? 'woocommerce' : 'options-general.php';
            $capability = current_user_can('manage_woocommerce') ? 'manage_woocommerce' : 'manage_options';

            add_submenu_page(
                $parent_slug,
                'World New Music Catalog',
                'World New Music',
                $capability,
                'worldnew-music-catalog',
                array($this, 'render_music_catalog_page')
            );
        }

        private function get_music_tracks($args = array()) {
            if (! post_type_exists('product')) {
                return array();
            }

            $defaults = array(
                'featured_only' => false,
                'limit'         => 100,
            );
            $args = wp_parse_args($args, $defaults);

            $query = new WP_Query(array(
                'post_type'      => 'product',
                'post_status'    => 'publish',
                'posts_per_page' => max(1, (int) $args['limit']),
                'orderby'        => 'date',
                'order'          => 'DESC',
            ));

            $rows = array();

            foreach ($query->posts as $post) {
                $product = function_exists('wc_get_product') ? wc_get_product($post->ID) : null;
                if (! $this->is_music_product_compatible($product, $post->ID)) {
                    continue;
                }
                if (! empty($args['featured_only']) && get_post_meta($post->ID, '_worldnew_music_featured', true) !== 'yes') {
                    continue;
                }

                $price = $product && method_exists($product, 'get_price') ? $product->get_price() : '';
                $currency = function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : 'GBP';
                $checkout_url = $this->get_music_checkout_url($post->ID);
                $configured_stream_url = (string) get_post_meta($post->ID, '_worldnew_music_stream_url', true);
                $resolved_stream_url = $this->resolve_music_stream_url($product, $configured_stream_url);
                $cover_image_url = (string) get_post_meta($post->ID, '_worldnew_music_cover_url', true);

                if (! $cover_image_url && is_object($product) && method_exists($product, 'get_image_id')) {
                    $image_id = (int) $product->get_image_id();
                    if ($image_id > 0) {
                        $cover_image_url = (string) wp_get_attachment_image_url($image_id, 'large');
                    }
                }

                $download_info = $this->get_download_context_for_current_user($post->ID);

                $rows[] = array(
                    'id'               => (int) $post->ID,
                    'title'            => get_the_title($post),
                    'artist'           => (string) get_post_meta($post->ID, '_worldnew_music_artist', true),
                    'genre'            => (string) get_post_meta($post->ID, '_worldnew_music_genre', true),
                    'duration'         => (string) get_post_meta($post->ID, '_worldnew_music_duration', true),
                    'preview_seconds'  => (int) get_post_meta($post->ID, '_worldnew_music_preview_seconds', true),
                    'cover_image_url'  => $cover_image_url,
                    'stream_url'       => $resolved_stream_url,
                    'price'            => '' !== $price ? (float) $price : null,
                    'currency'         => $currency,
                    'checkout_url'     => $checkout_url,
                    'product_url'      => get_permalink($post->ID),
                    'is_featured'      => get_post_meta($post->ID, '_worldnew_music_featured', true) === 'yes',
                    'can_download'     => ! empty($download_info['can_download']),
                    'download_url'     => isset($download_info['download_url']) ? (string) $download_info['download_url'] : '',
                );
            }

            wp_reset_postdata();

            return $rows;
        }

        private function is_music_product_compatible($product, $post_id) {
            $enabled = get_post_meta($post_id, '_worldnew_music_enabled', true) === 'yes';
            $stream_url = trim((string) get_post_meta($post_id, '_worldnew_music_stream_url', true));

            if ($enabled || $stream_url) {
                return true;
            }

            if (! is_object($product) || ! method_exists($product, 'is_downloadable') || ! $product->is_downloadable()) {
                return false;
            }

            if (! method_exists($product, 'get_downloads')) {
                return false;
            }

            $downloads = $product->get_downloads();
            if (! is_array($downloads) || empty($downloads)) {
                return false;
            }

            foreach ($downloads as $download_file) {
                if (! $download_file || ! method_exists($download_file, 'get_enabled') || ! $download_file->get_enabled()) {
                    continue;
                }

                $file_url = method_exists($download_file, 'get_file') ? (string) $download_file->get_file() : '';
                if ($file_url && preg_match('/\.(mp3|m4a|aac|wav|ogg|flac)(\?.*)?$/i', $file_url)) {
                    return true;
                }
            }

            return false;
        }

        private function resolve_music_stream_url($product, $configured_stream_url = '') {
            $stream_url = trim((string) $configured_stream_url);
            if ($stream_url) {
                return esc_url_raw($stream_url);
            }

            if (! is_object($product) || ! method_exists($product, 'is_downloadable') || ! $product->is_downloadable()) {
                return '';
            }

            if (! method_exists($product, 'get_downloads')) {
                return '';
            }

            $downloads = $product->get_downloads();
            if (! is_array($downloads) || empty($downloads)) {
                return '';
            }

            foreach ($downloads as $download_file) {
                if (! $download_file || ! method_exists($download_file, 'get_enabled') || ! $download_file->get_enabled()) {
                    continue;
                }

                $file_url = method_exists($download_file, 'get_file') ? (string) $download_file->get_file() : '';
                if ($file_url && preg_match('/\.(mp3|m4a|aac|wav|ogg|flac)(\?.*)?$/i', $file_url)) {
                    return esc_url_raw($file_url);
                }
            }

            foreach ($downloads as $download_file) {
                if (! $download_file || ! method_exists($download_file, 'get_enabled') || ! $download_file->get_enabled()) {
                    continue;
                }

                $file_url = method_exists($download_file, 'get_file') ? (string) $download_file->get_file() : '';
                if ($file_url) {
                    return esc_url_raw($file_url);
                }
            }

            return '';
        }

        private function get_download_context_for_current_user($product_id) {
            if (! is_user_logged_in() || ! function_exists('wc_get_customer_available_downloads')) {
                return array(
                    'can_download' => false,
                    'download_url' => '',
                );
            }

            $downloads = wc_get_customer_available_downloads(get_current_user_id());
            if (! is_array($downloads) || empty($downloads)) {
                return array(
                    'can_download' => false,
                    'download_url' => '',
                );
            }

            foreach ($downloads as $download) {
                $download_product_id = isset($download['product_id']) ? (int) $download['product_id'] : 0;
                if ((int) $product_id !== $download_product_id) {
                    continue;
                }

                return array(
                    'can_download' => true,
                    'download_url' => isset($download['download_url']) ? (string) $download['download_url'] : '',
                );
            }

            return array(
                'can_download' => false,
                'download_url' => '',
            );
        }

        private function get_music_checkout_url($product_id) {
            if (! function_exists('wc_get_checkout_url')) {
                return add_query_arg('add-to-cart', (int) $product_id, home_url('/'));
            }

            return add_query_arg(
                array(
                    'add-to-cart' => (int) $product_id,
                    'quantity'    => 1,
                ),
                wc_get_checkout_url()
            );
        }

        public function render_music_catalog_page() {
            if (! current_user_can('manage_options') && ! current_user_can('manage_woocommerce')) {
                return;
            }

            $tracks = $this->get_music_tracks(array('limit' => 250));
            ?>
            <div class="wrap">
                <h1>World New Music Catalog</h1>
                <p>Manage track metadata directly on WooCommerce products. Open a product and update the <strong>World New Music Track</strong> panel.</p>
                <p><a href="<?php echo esc_url(admin_url('edit.php?post_type=product')); ?>" class="button button-primary">Open Products</a></p>
                <table class="widefat striped" style="margin-top:1rem;">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Genre</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Featured</th>
                            <th>Stream URL</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($tracks)) : ?>
                            <tr><td colspan="9">No music tracks found yet. Enable a product as music in the product editor.</td></tr>
                        <?php else : ?>
                            <?php foreach ($tracks as $track) : ?>
                                <tr>
                                    <td><?php echo esc_html((string) $track['id']); ?></td>
                                    <td><?php echo esc_html($track['title']); ?></td>
                                    <td><?php echo esc_html($track['artist']); ?></td>
                                    <td><?php echo esc_html($track['genre']); ?></td>
                                    <td><?php echo esc_html($track['duration']); ?></td>
                                    <td>
                                        <?php
                                        if (null !== $track['price']) {
                                            echo esc_html($track['currency'] . ' ' . number_format((float) $track['price'], 2));
                                        } else {
                                            echo '&mdash;';
                                        }
                                        ?>
                                    </td>
                                    <td><?php echo ! empty($track['is_featured']) ? 'Yes' : 'No'; ?></td>
                                    <td>
                                        <?php if (! empty($track['stream_url'])) : ?>
                                            <a href="<?php echo esc_url($track['stream_url']); ?>" target="_blank" rel="noopener noreferrer">Open</a>
                                        <?php else : ?>
                                            &mdash;
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <a href="<?php echo esc_url(get_edit_post_link((int) $track['id'], '')); ?>">Edit</a>
                                        |
                                        <a href="<?php echo esc_url($track['checkout_url']); ?>" target="_blank" rel="noopener noreferrer">Checkout</a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            <?php
        }

        public function render_music_streamer_shortcode($atts) {
            $atts = shortcode_atts(
                array(
                    'limit'    => 12,
                    'featured' => 'no',
                ),
                $atts,
                'woo_music_streamer'
            );

            $tracks = $this->get_music_tracks(array(
                'limit'         => (int) $atts['limit'],
                'featured_only' => 'yes' === strtolower((string) $atts['featured']),
            ));

            if (empty($tracks) && 'yes' === strtolower((string) $atts['featured'])) {
                $tracks = $this->get_music_tracks(array(
                    'limit'         => (int) $atts['limit'],
                    'featured_only' => false,
                ));
            }

            if (empty($tracks)) {
                return '<p>No tracks are available right now.</p>';
            }

            $settings = $this->get_settings();
            $app_base_url = ! empty($settings['app_base_url']) ? untrailingslashit($settings['app_base_url']) : '';
            $artist_image_url = $app_base_url ? $app_base_url . '/music-player-assets/franke.png' : (! empty($tracks[0]['cover_image_url']) ? (string) $tracks[0]['cover_image_url'] : '');
            $wordmark_url = $app_base_url ? $app_base_url . '/music-player-assets/world.new.png' : '';

            ob_start();
            ?>
            <section class="worldnew-music-player-shell">
                <audio id="worldnew-music-preview-audio" preload="none" playsinline class="worldnew-audio-el"></audio>
                <div class="worldnew-music-player-head">
                    <div class="worldnew-artist-lockup">
                        <?php if ($artist_image_url) : ?>
                            <img class="worldnew-artist-photo" src="<?php echo esc_url($artist_image_url); ?>" alt="franke." />
                        <?php endif; ?>
                        <div>
                            <h3>franke.</h3>
                            <p>Top tracks</p>
                            <span class="worldnew-ui-pill worldnew-ui-pill--follow" aria-hidden="true">Follow</span>
                        </div>
                    </div>
                    <?php if ($wordmark_url) : ?>
                        <img class="worldnew-wordmark" src="<?php echo esc_url($wordmark_url); ?>" alt="World New" />
                    <?php else : ?>
                        <strong class="worldnew-wordmark-text">WORLD.NEW.</strong>
                    <?php endif; ?>
                </div>
                <div class="worldnew-preview-rail" aria-hidden="true">
                    <span class="worldnew-ui-pill worldnew-ui-pill--preview">Preview</span>
                    <span class="worldnew-preview-line"></span>
                </div>
                <ol class="worldnew-track-list">
                <?php foreach ($tracks as $track) : ?>
                    <?php
                    $track_number = isset($track_number) ? $track_number + 1 : 1;
                    $artist_label = ! empty($track['artist']) ? $track['artist'] : 'World New';
                    $price_label = null !== $track['price'] ? $track['currency'] . number_format((float) $track['price'], 2) : 'Buy';
                    $action_url = ! empty($track['can_download']) && ! empty($track['download_url'])
                        ? $track['download_url']
                        : $track['checkout_url'];
                    ?>
                    <li class="worldnew-track-row">
                        <div class="worldnew-track-main">
                            <span class="worldnew-drop" aria-hidden="true">
                                <svg viewBox="0 0 640 640" focusable="false">
                                    <path d="M320 576C214 576 128 490 128 384C128 292.8 258.2 109.9 294.6 60.5C300.5 52.5 309.8 48 319.8 48L320.2 48C330.2 48 339.5 52.5 345.4 60.5C381.8 109.9 512 292.8 512 384C512 490 426 576 320 576zM240 376C240 362.7 229.3 352 216 352C202.7 352 192 362.7 192 376C192 451.1 252.9 512 328 512C341.3 512 352 501.3 352 488C352 474.7 341.3 464 328 464C279.4 464 240 424.6 240 376z"></path>
                                </svg>
                            </span>
                            <span class="worldnew-track-number"><?php echo esc_html((string) $track_number); ?></span>
                            <span class="worldnew-track-copy">
                                <strong><?php echo esc_html($track['title']); ?></strong>
                                <small><?php echo esc_html($artist_label); ?></small>
                            </span>
                        </div>
                        <?php $preview_seconds = ! empty($track['preview_seconds']) ? (int) $track['preview_seconds'] : 30; ?>
                        <div class="worldnew-track-actions">
                            <a class="worldnew-price-pill" href="<?php echo esc_url($action_url); ?>">
                                <?php echo ! empty($track['can_download']) ? 'Download' : esc_html($price_label); ?>
                            </a>
                            <?php if (! empty($track['stream_url'])) : ?>
                                <button
                                    type="button"
                                    class="worldnew-track-play"
                                    data-worldnew-stream="<?php echo esc_url($track['stream_url']); ?>"
                                    data-worldnew-preview-seconds="<?php echo esc_attr((string) max(5, $preview_seconds)); ?>"
                                    aria-label="<?php echo esc_attr('Play preview for ' . $track['title']); ?>"
                                >
                                    <span class="worldnew-play-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" focusable="false">
                                            <path d="M8 5v14l11-7z"></path>
                                        </svg>
                                    </span>
                                    <span class="worldnew-pause-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" focusable="false">
                                            <path d="M7 5h4v14H7zM13 5h4v14h-4z"></path>
                                        </svg>
                                    </span>
                                </button>
                            <?php endif; ?>
                            <span class="worldnew-track-time" data-worldnew-initial-time="<?php echo esc_attr(gmdate('i:s', max(5, $preview_seconds))); ?>"><?php echo esc_html(gmdate('i:s', max(5, $preview_seconds))); ?></span>
                        </div>
                    </li>
                <?php endforeach; ?>
                </ol>
            </section>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap');
                .worldnew-music-player-shell { border:1px solid #f7c4e0; border-radius:20px; padding:24px; background:#fff; color:#111827; box-shadow:0 20px 38px rgba(15,23,42,.18); font-family:'Bricolage Grotesque', 'Trebuchet MS', sans-serif; }
                .worldnew-music-player-shell * { box-sizing:border-box; font-family:inherit; }
                .worldnew-music-player-head { display:flex; justify-content:space-between; gap:20px; padding-bottom:10px; }
                .worldnew-artist-lockup { display:flex; gap:18px; align-items:flex-end; }
                .worldnew-artist-photo { width:164px; height:164px; object-fit:cover; border-radius:24px; }
                .worldnew-artist-lockup h3 { margin:0; color:#1f1f1f; font-size:44px; line-height:.95; font-weight:800; letter-spacing:-.04em; }
                .worldnew-artist-lockup p { margin:10px 0 12px; color:#111827; font-size:17px; }
                .worldnew-wordmark { width:172px; height:auto; align-self:flex-start; object-fit:contain; }
                .worldnew-wordmark-text { align-self:flex-start; font-size:24px; font-style:italic; color:#111827; }
                .worldnew-ui-pill { display:inline-flex; align-items:center; justify-content:center; border-radius:8px; background:#202020; color:#fff; font-weight:600; line-height:1; pointer-events:none; user-select:none; }
                .worldnew-ui-pill--follow { min-height:30px; padding:7px 16px; font-size:16px; }
                .worldnew-preview-rail { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:28px; margin:22px 0 10px; }
                .worldnew-ui-pill--preview { min-height:28px; padding:7px 16px; font-size:15px; }
                .worldnew-preview-line { display:block; height:3px; background:#d4d4d8; }
                .worldnew-track-list { list-style:none; margin:0; padding:0; }
                .worldnew-track-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:18px; border-bottom:1px solid #d4d4d8; padding:16px 0; }
                .worldnew-track-row:last-child { border-bottom:0; }
                .worldnew-track-main { display:grid; grid-template-columns:18px 34px minmax(0,1fr); align-items:center; gap:12px; min-width:0; }
                .worldnew-drop { color:#F839A9; display:inline-flex; align-items:center; justify-content:center; line-height:1; }
                .worldnew-drop svg { width:12px; height:12px; display:block; fill:currentColor; }
                .worldnew-track-number { color:#111827; font-weight:700; font-size:16px; text-align:right; }
                .worldnew-track-copy { min-width:0; }
                .worldnew-track-copy strong { display:block; color:#111827; font-size:19px; font-weight:500; overflow-wrap:anywhere; letter-spacing:-.015em; }
                .worldnew-track-copy small { display:block; margin-top:3px; color:#9ca3af; font-size:14px; }
                .worldnew-track-actions { display:flex; align-items:center; gap:12px; }
                .worldnew-price-pill { min-width:86px; border-radius:999px; background:#202020; color:#fff !important; padding:7px 14px; text-align:center; font-weight:700; font-size:14px; text-decoration:none !important; line-height:1.1; white-space:nowrap; }
                .worldnew-price-pill:hover { color:#fff !important; text-decoration:none !important; filter:brightness(.95); }
                .worldnew-track-play { width:48px; height:48px; border:0 !important; border-radius:999px; background:#f3f4f6 !important; color:#F839A9 !important; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; transition:background .18s ease, color .18s ease, transform .18s ease; }
                .worldnew-track-play:hover, .worldnew-track-play:focus { background:#fff0f8 !important; color:#F839A9 !important; transform:translateY(-1px); outline:2px solid rgba(248,57,169,.22); outline-offset:3px; }
                .worldnew-track-play.is-playing { background:#F839A9 !important; color:#fff !important; }
                .worldnew-track-play svg { width:22px; height:22px; display:block; fill:currentColor; }
                .worldnew-track-play .worldnew-pause-icon { display:none; }
                .worldnew-track-play.is-playing .worldnew-play-icon { display:none; }
                .worldnew-track-play.is-playing .worldnew-pause-icon { display:block; }
                .worldnew-track-time { color:#111827; font-size:19px; font-weight:700; min-width:52px; font-variant-numeric:tabular-nums; }
                .worldnew-audio-el { display:none; }
                @media (max-width:760px) {
                    .worldnew-music-player-shell { padding:16px; }
                    .worldnew-music-player-head { align-items:flex-start; }
                    .worldnew-artist-photo { width:96px; height:96px; border-radius:18px; }
                    .worldnew-artist-lockup h3 { font-size:34px; }
                    .worldnew-artist-lockup p { font-size:15px; margin:8px 0 10px; }
                    .worldnew-wordmark { width:120px; }
                    .worldnew-track-row { grid-template-columns:1fr; gap:10px; }
                    .worldnew-track-actions { justify-content:flex-end; }
                    .worldnew-track-copy strong { font-size:17px; }
                }
            </style>
            <script>
                (function(){
                    var shells = document.querySelectorAll('.worldnew-music-player-shell');
                    var shell = shells.length ? shells[shells.length - 1] : null;
                    if (!shell) return;
                    var audio = shell.querySelector('#worldnew-music-preview-audio');
                    if (!audio) return;
                    var activeBtn = null;
                    var activeTime = null;
                    var limitSeconds = 30;
                    var timer = null;

                    function formatTime(seconds) {
                        var safeSeconds = Math.max(0, parseInt(seconds, 10) || 0);
                        var minutes = Math.floor(safeSeconds / 60);
                        var remainder = safeSeconds % 60;

                        return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
                    }

                    function resetActiveTime() {
                        if (activeTime) {
                            activeTime.textContent = activeTime.getAttribute('data-worldnew-initial-time') || formatTime(limitSeconds);
                        }
                    }

                    function clearPlayingState(resetTimerText) {
                        if (activeBtn) {
                            activeBtn.classList.remove('is-playing');
                            activeBtn = null;
                        }
                        if (resetTimerText) {
                            resetActiveTime();
                        }
                        activeTime = null;
                        if (timer) {
                            window.clearInterval(timer);
                            timer = null;
                        }
                    }

                    function stopPreview(resetTimerText) {
                        audio.pause();
                        try {
                            audio.currentTime = 0;
                        } catch (error) {}
                        clearPlayingState(resetTimerText);
                    }

                    function updateCountdown() {
                        if (!activeTime) return;

                        var remaining = Math.max(0, Math.ceil(limitSeconds - audio.currentTime));
                        activeTime.textContent = formatTime(remaining);

                        if (remaining <= 0) {
                            var finishedTime = activeTime;
                            stopPreview(false);
                            if (finishedTime) {
                                finishedTime.textContent = formatTime(0);
                            }
                        }
                    }

                    shell.querySelectorAll('.worldnew-track-play').forEach(function(btn){
                        btn.addEventListener('click', function(){
                            var src = btn.getAttribute('data-worldnew-stream');
                            var nextLimit = parseInt(btn.getAttribute('data-worldnew-preview-seconds') || '30', 10);
                            if (!src) return;

                            if (activeBtn === btn && !audio.paused) {
                                stopPreview(true);
                                return;
                            }

                            stopPreview(true);
                            limitSeconds = isNaN(nextLimit) ? 30 : Math.max(5, nextLimit);
                            activeBtn = btn;
                            activeTime = btn.closest('.worldnew-track-row').querySelector('.worldnew-track-time');
                            audio.src = src;
                            audio.currentTime = 0;
                            btn.classList.add('is-playing');
                            if (activeTime) {
                                activeTime.textContent = formatTime(limitSeconds);
                            }

                            timer = window.setInterval(function(){
                                updateCountdown();
                            }, 200);

                            audio.play().catch(function(){
                                stopPreview(true);
                            });
                        });
                    });

                    audio.addEventListener('timeupdate', updateCountdown);
                    audio.addEventListener('ended', function(){ stopPreview(false); });
                    audio.addEventListener('error', function(){ stopPreview(true); });
                })();
            </script>
            <?php

            return ob_get_clean();
        }

        public function handle_rest_music_catalog($request) {
            $featured_only = strtolower((string) $request->get_param('featured')) === 'yes';
            $limit = (int) $request->get_param('limit');
            $tracks = $this->get_music_tracks(array(
                'featured_only' => $featured_only,
                'limit'         => $limit > 0 ? min($limit, 250) : 120,
            ));

            return new WP_REST_Response(array(
                'success' => true,
                'count'   => count($tracks),
                'tracks'  => $tracks,
            ), 200);
        }
    }
}

new WorldNewCommunityBridge();
