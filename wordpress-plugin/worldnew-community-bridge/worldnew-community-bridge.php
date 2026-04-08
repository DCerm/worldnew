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

            add_shortcode('worldnew_community_button', array($this, 'render_shortcode'));

            add_action('admin_bar_menu', array($this, 'add_admin_bar_link'), 90);
            add_action('woocommerce_account_dashboard', array($this, 'render_account_cta'));

            add_action('woocommerce_order_status_completed', array($this, 'handle_order_completed'));
            add_action('woocommerce_order_status_processing', array($this, 'handle_order_processing'));
            add_action('woocommerce_subscription_status_updated', array($this, 'handle_subscription_status_updated'), 10, 3);
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

            if (! $url) {
                return;
            }

            echo '<p><a class="button button-primary" href="' . esc_url($url) . '">Open Community App</a></p>';
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
                    if ('administrator' === $role || 'shop_manager' === $role) {
                        $roles[] = 'super_admin';
                    }

                    if (false !== strpos($role, 'artist')) {
                        $roles[] = 'artist_admin';
                    }
                }
            }

            return array_values(array_unique($roles));
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

            $user_id = method_exists($subscription, 'get_user_id') ? (int) $subscription->get_user_id() : 0;
            $user    = $user_id ? get_userdata($user_id) : null;

            $payload = array(
                'event'           => 'subscription.updated',
                'order_id'        => method_exists($subscription, 'get_parent_id') ? $subscription->get_parent_id() : null,
                'subscription_id' => $subscription->get_id(),
                'user'            => array(
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
                    'currency'   => method_exists($subscription, 'get_currency') ? $subscription->get_currency() : 'USD',
                ),
                'meta'            => array(
                    'old_status' => $old_status,
                ),
            );

            $settings = $this->get_settings();
            $this->send_signed_json($settings['webhook_path'], $payload);
        }
    }
}

new WorldNewCommunityBridge();
