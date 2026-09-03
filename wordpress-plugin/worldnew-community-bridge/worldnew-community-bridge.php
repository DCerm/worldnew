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
            add_action('admin_enqueue_scripts', array($this, 'enqueue_lovebox_product_admin_assets'));
            add_filter('woocommerce_product_data_tabs', array($this, 'register_worldnew_music_product_data_tab'));
            add_action('woocommerce_product_data_panels', array($this, 'render_worldnew_music_product_data_panel'));
            add_action('save_post_product', array($this, 'save_music_product_meta'), 10, 3);
            add_action('save_post_product', array($this, 'save_video_product_meta'), 10, 3);
            add_action('save_post_product', array($this, 'save_lovebox_product_meta'), 10, 3);
            add_action('admin_menu', array($this, 'register_music_catalog_page'));

            add_shortcode('worldnew_community_button', array($this, 'render_shortcode'));
            add_shortcode('woo_music_streamer', array($this, 'render_music_streamer_shortcode'));

            add_action('admin_bar_menu', array($this, 'add_admin_bar_link'), 90);
            add_action('woocommerce_account_dashboard', array($this, 'render_account_cta'));
            add_action('admin_post_nopriv_lovebox_fast_checkout', array($this, 'handle_lovebox_fast_checkout'));
            add_action('admin_post_lovebox_fast_checkout', array($this, 'handle_lovebox_fast_checkout'));
            add_action('woocommerce_checkout_create_order', array($this, 'attach_gift_context_to_order'), 10, 2);
            add_action('woocommerce_checkout_create_subscription', array($this, 'attach_gift_context_to_subscription'), 10, 4);
            add_action('woocommerce_checkout_create_order_line_item', array($this, 'attach_lovebox_order_line_item_meta'), 10, 4);
            add_action('woocommerce_checkout_create_order', array($this, 'attach_lovebox_order_meta'), 20, 2);
            add_action('woocommerce_thankyou', array($this, 'clear_gift_checkout_context'));
            add_action('woocommerce_thankyou', array($this, 'render_thankyou_download_panel'), 25);
            add_action('woocommerce_admin_order_data_after_billing_address', array($this, 'render_lovebox_order_admin_panel'), 10, 1);

            add_filter('woocommerce_add_cart_item_data', array($this, 'attach_lovebox_cart_item_data'), 10, 2);
            add_filter('woocommerce_get_item_data', array($this, 'render_lovebox_cart_item_data'), 10, 2);
            add_filter('woocommerce_checkout_fields', array($this, 'filter_lovebox_checkout_fields'), 20);
            add_action('woocommerce_before_calculate_totals', array($this, 'apply_worldnew_community_cart_prices'), 20);
            add_action('woocommerce_checkout_create_order_line_item', array($this, 'attach_worldnew_community_price_order_item_meta'), 10, 4);
            add_action('woocommerce_before_checkout_form', array($this, 'render_worldnew_checkout_trust_panel'), 5);

            add_action('template_redirect', array($this, 'redirect_lovebox_products_to_custom_layout'), 8);
            add_action('template_redirect', array($this, 'render_lovebox_page'), 9);
            add_action('template_redirect', array($this, 'render_album_product_layout'), 9);
            add_action('woocommerce_order_status_completed', array($this, 'handle_order_completed'));
            add_action('woocommerce_order_status_processing', array($this, 'handle_order_processing'));
            add_action('woocommerce_subscription_status_updated', array($this, 'handle_subscription_status_updated'), 10, 3);
            add_action('wp_head', array($this, 'output_worldnew_account_styles'), 100);
            add_action('wp_head', array($this, 'output_worldnew_checkout_styles'), 100);
            add_action('wp_head', array($this, 'output_worldnew_lovebox_styles'), 101);
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

            register_rest_route(
                'worldnew/v1',
                '/music/admin/list',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_music_admin_list'),
                )
            );

            register_rest_route(
                'worldnew/v1',
                '/music/admin/upsert',
                array(
                    'methods'             => 'POST',
                    'permission_callback' => '__return_true',
                    'callback'            => array($this, 'handle_rest_music_admin_upsert'),
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

        private function get_community_price_override_for_product($product_id) {
            $product_id = absint($product_id);

            if ($product_id < 1) {
                return null;
            }

            $raw_price = (string) get_post_meta($product_id, '_worldnew_music_community_price', true);

            if ('' === trim($raw_price)) {
                $raw_price = (string) get_post_meta($product_id, '_worldnew_album_community_price', true);
            }

            if ('' === trim($raw_price) || ! is_numeric($raw_price)) {
                return null;
            }

            $amount = max(0, (float) $raw_price);

            return array(
                'amount' => number_format($amount, 2, '.', ''),
                'source' => 'community',
            );
        }

        private function get_clean_product_price_html($product) {
            if (! $product || ! method_exists($product, 'get_price')) {
                return '';
            }

            $price = (string) $product->get_price();

            if (method_exists($product, 'is_on_sale') && $product->is_on_sale()) {
                $regular_price = method_exists($product, 'get_regular_price') ? (string) $product->get_regular_price() : '';
                $sale_price = method_exists($product, 'get_sale_price') ? (string) $product->get_sale_price() : '';

                if ($regular_price !== '' && $sale_price !== '' && function_exists('wc_price')) {
                    return '<del>' . wc_price($regular_price) . '</del> <ins>' . wc_price($sale_price) . '</ins>';
                }
            }

            if ($price !== '' && function_exists('wc_price')) {
                return wc_price($price);
            }

            return method_exists($product, 'get_price_html') ? (string) $product->get_price_html() : '';
        }

        public function apply_worldnew_community_cart_prices($cart) {
            if (is_admin() && ! wp_doing_ajax()) {
                return;
            }

            if (! is_object($cart) || ! method_exists($cart, 'get_cart')) {
                return;
            }

            foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
                if (
                    empty($cart_item['worldnew_community_price_override']) ||
                    empty($cart_item['data']) ||
                    ! is_object($cart_item['data']) ||
                    ! method_exists($cart_item['data'], 'set_price')
                ) {
                    continue;
                }

                $override = $cart_item['worldnew_community_price_override'];
                $amount = isset($override['amount']) && is_numeric($override['amount'])
                    ? (float) $override['amount']
                    : null;

                if (null === $amount || $amount < 0) {
                    continue;
                }

                $cart_item['data']->set_price($amount);
            }
        }

        public function attach_worldnew_community_price_order_item_meta($item, $cart_item_key, $values, $order) {
            if (
                ! is_object($item) ||
                ! method_exists($item, 'add_meta_data') ||
                empty($values['worldnew_community_price_override'])
            ) {
                return;
            }

            $override = $values['worldnew_community_price_override'];
            $amount = isset($override['amount']) ? (string) $override['amount'] : '';

            if ('' === $amount) {
                return;
            }

            $item->add_meta_data('_worldnew_community_price_applied', 'yes', true);
            $item->add_meta_data('_worldnew_community_price_amount', $amount, true);
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
                .woocommerce-order-received .woocommerce a:hover { color: #d91f87 !important; }
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
                    background: #d91f87 !important;
                    color: #ffffff !important;
                    border-color: #d91f87 !important;
                }
                .woocommerce-account .entry-content > .woocommerce,
                .woocommerce-order-received .entry-content > .woocommerce {
                    background: #fff7fc;
                    border: 1px solid #f7c8e4;
                    border-radius: 20px;
                    padding: 18px;
                    min-height: 90vh;
                }
                .woocommerce-account .woocommerce-MyAccount-navigation {
                    width: 280px;
                    margin-right: 24px;
                    padding: 14px;
                    background: #ffffff;
                    border: 1px solid #f7c8e4;
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
                    background: #ffeff8;
                    color: #F839A9 !important;
                }
                .woocommerce-account .woocommerce-MyAccount-content {
                    background: #ffffff;
                    border: 1px solid #f7c8e4;
                    border-radius: 16px;
                    padding: 18px 22px;
                    min-height: 90vh;
                }
                .woocommerce-order-received .woocommerce-order {
                    background: #ffffff;
                    border: 1px solid #f7c8e4;
                    border-radius: 16px;
                    padding: 18px 22px;
                }
                .worldnew-post-order-panel {
                    margin-top: 18px;
                    border: 1px solid #f7c8e4;
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
                .worldnew-post-order-panel__btn:hover { background: #d91f87; color: #fff !important; text-decoration: none !important; }
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

        public function output_worldnew_lovebox_styles() {
            $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) wp_unslash($_SERVER['REQUEST_URI']) : '';
            $path = trim((string) wp_parse_url($request_uri, PHP_URL_PATH), '/');

            if (! in_array($path, array('lovebox', 'cameo'), true)) {
                return;
            }
            ?>
            <style id="worldnew-lovebox-polish">
                body {
                    --worldnew-pink: #F839A9;
                    --worldnew-pink-dark: #d91f87;
                    --worldnew-pink-soft: #fff0f8;
                }
                body .elementor-location-header,
                body .site-header {
                    background: var(--worldnew-pink) !important;
                }
                body {
                    background: linear-gradient(90deg, #fff1fa 0%, #fff 48%, #fff7fc 100%) !important;
                }
                body .entry-content,
                body .site-main,
                body main,
                body .elementor,
                body .elementor-section,
                body .elementor-container,
                body .e-con {
                    --e-global-color-primary: var(--worldnew-pink) !important;
                    --e-global-color-secondary: #111827 !important;
                    --e-global-color-accent: var(--worldnew-pink) !important;
                }
                body .elementor-nav-menu,
                body .wp-block-navigation__container,
                body .worldnew-cameo-tabs,
                body .worldnew-lovebox-tabs,
                body .cameo-tabs,
                body .lovebox-tabs {
                    justify-content: center !important;
                    text-align: center;
                }
                body .elementor-nav-menu a:hover,
                body .elementor-nav-menu a:focus,
                body .wp-block-navigation a:hover,
                body .wp-block-navigation a:focus {
                    color: #ffffff !important;
                    opacity: .86;
                }
                body .elementor-button,
                body .wp-block-button__link,
                body .worldnew-cameo-button,
                body .worldnew-lovebox-button,
                body button,
                body input[type="submit"],
                body input[type="button"],
                body a[class*="button"],
                body a[href*="book"],
                body a[href*="lovebox_request"] {
                    background: var(--worldnew-pink) !important;
                    border-color: var(--worldnew-pink) !important;
                    color: #ffffff !important;
                    box-shadow: 0 18px 34px -22px rgba(248, 57, 169, .95);
                }
                body .elementor-nav-menu a,
                body .wp-block-navigation a,
                body header a:not([class*="button"]):not([href*="book"]) {
                    background: transparent !important;
                    box-shadow: none !important;
                }
                body .elementor-location-header a[href*="book"],
                body .site-header a[href*="book"],
                body header a[href*="book"],
                body .elementor-location-header a:last-child,
                body .site-header a:last-child,
                body header a:last-child,
                body .worldnew-cameo-nav-cta {
                    background: #050505 !important;
                    border-color: #050505 !important;
                    color: var(--worldnew-pink) !important;
                }
                body .elementor-button:hover,
                body .elementor-button:focus,
                body .wp-block-button__link:hover,
                body .wp-block-button__link:focus,
                body .worldnew-cameo-button:hover,
                body .worldnew-cameo-button:focus,
                body .worldnew-lovebox-button:hover,
                body .worldnew-lovebox-button:focus,
                body button:hover,
                body button:focus,
                body input[type="submit"]:hover,
                body input[type="submit"]:focus,
                body input[type="button"]:hover,
                body input[type="button"]:focus,
                body a[class*="button"]:hover,
                body a[class*="button"]:focus {
                    background: var(--worldnew-pink-dark) !important;
                    border-color: var(--worldnew-pink-dark) !important;
                    color: #ffffff !important;
                }
                body .elementor-location-header a[href*="book"]:hover,
                body .elementor-location-header a[href*="book"]:focus,
                body .site-header a[href*="book"]:hover,
                body .site-header a[href*="book"]:focus,
                body header a[href*="book"]:hover,
                body header a[href*="book"]:focus,
                body .elementor-location-header a:last-child:hover,
                body .elementor-location-header a:last-child:focus,
                body .site-header a:last-child:hover,
                body .site-header a:last-child:focus,
                body header a:last-child:hover,
                body header a:last-child:focus,
                body .worldnew-cameo-nav-cta:hover,
                body .worldnew-cameo-nav-cta:focus {
                    background: #050505 !important;
                    border-color: #050505 !important;
                    color: var(--worldnew-pink) !important;
                    filter: brightness(.94);
                }
                body .worldnew-cameo-card,
                body .worldnew-lovebox-card,
                body .cameo-card,
                body .lovebox-card,
                body .elementor-widget-container,
                body .woocommerce div.product {
                    border-color: rgba(248, 57, 169, .18) !important;
                    box-shadow: 0 28px 70px -48px rgba(248, 57, 169, .9);
                }
                body .worldnew-cameo-card__title,
                body .worldnew-lovebox-card__title,
                body .cameo-card__title,
                body .lovebox-card__title {
                    background: linear-gradient(180deg, #ffe4f4, #fff3fa) !important;
                    color: #111827 !important;
                    text-align: center;
                }
                body [style*="#1495"],
                body [style*="#1294"],
                body [style*="#0d6efd"],
                body [style*="#0074cc"],
                body [style*="rgb(20, 149"],
                body [style*="rgb(18, 148"],
                body [style*="rgb(13, 110"] {
                    background-color: var(--worldnew-pink) !important;
                    border-color: var(--worldnew-pink) !important;
                    color: #ffffff !important;
                }
                body .worldnew-cameo-accent,
                body .worldnew-lovebox-accent,
                body .cameo-accent,
                body .lovebox-accent {
                    color: var(--worldnew-pink) !important;
                    border-color: var(--worldnew-pink) !important;
                }
                body .worldnew-cameo-occasion {
                    display: grid;
                    gap: 6px;
                    margin: 0 0 10px;
                    color: #111827;
                    font-size: 13px;
                    font-weight: 800;
                }
                body .worldnew-cameo-occasion select {
                    width: 100%;
                    border: 1px solid #f7c8e4;
                    border-radius: 14px;
                    background: #fff;
                    color: #111827;
                    padding: 10px 12px;
                    font: inherit;
                }
                body .worldnew-cameo-reasons,
                body .worldnew-lovebox-reasons,
                body .cameo-reasons,
                body .lovebox-reasons {
                    display: flex;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 12px;
                }
            </style>
            <?php
        }

        public function render_worldnew_checkout_trust_panel() {
            if (! function_exists('is_checkout') || ! is_checkout() || (function_exists('is_order_received_page') && is_order_received_page())) {
                return;
            }
            ?>
            <section class="worldnew-checkout-trust-panel" aria-label="World New secure checkout">
                <p class="worldnew-checkout-trust-panel__eyebrow">World New Checkout</p>
                <h2>Secure purchase, instant access.</h2>
                <p>Your order is processed by WooCommerce and protected by the payment provider. Downloads are delivered to your account after purchase.</p>
                <div class="worldnew-checkout-trust-panel__badges">
                    <span>Secure payment</span>
                    <span>Account downloads</span>
                    <span>Community-ready pricing</span>
                </div>
            </section>
            <?php
        }

        public function output_worldnew_checkout_styles() {
            if (! function_exists('is_checkout') || ! is_checkout() || (function_exists('is_order_received_page') && is_order_received_page())) {
                return;
            }
            ?>
            <style id="worldnew-checkout-polish">
                .woocommerce-checkout .entry-content > .woocommerce {
                    max-width: 1180px;
                    margin: 0 auto;
                    border: 1px solid #ffd1e9;
                    border-radius: 28px;
                    background:
                        radial-gradient(circle at 90% 0%, rgba(248,57,169,.12), transparent 34%),
                        linear-gradient(180deg, #ffffff 0%, #fff8fc 100%);
                    padding: 22px;
                    box-shadow: 0 28px 70px -52px rgba(248,57,169,.85);
                }
                .worldnew-checkout-trust-panel {
                    margin: 0 0 22px;
                    border-radius: 24px;
                    background: #0b0b0f;
                    color: #ffffff;
                    padding: 24px;
                    overflow: hidden;
                    position: relative;
                }
                .worldnew-checkout-trust-panel::after {
                    content: "";
                    position: absolute;
                    width: 240px;
                    height: 240px;
                    right: -80px;
                    top: -110px;
                    border-radius: 999px;
                    background: rgba(248,57,169,.34);
                    filter: blur(6px);
                }
                .worldnew-checkout-trust-panel__eyebrow {
                    margin: 0 0 8px;
                    color: #F839A9;
                    font-size: .78rem;
                    font-weight: 800;
                    letter-spacing: .18em;
                    text-transform: uppercase;
                }
                .worldnew-checkout-trust-panel h2 {
                    position: relative;
                    z-index: 1;
                    margin: 0 0 8px;
                    color: #ffffff;
                    font-size: clamp(1.7rem, 4vw, 3rem);
                    line-height: 1;
                    letter-spacing: -.05em;
                }
                .worldnew-checkout-trust-panel p {
                    position: relative;
                    z-index: 1;
                    max-width: 680px;
                    margin: 0;
                    color: rgba(255,255,255,.78);
                    font-weight: 600;
                    line-height: 1.55;
                }
                .worldnew-checkout-trust-panel__badges {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 18px;
                }
                .worldnew-checkout-trust-panel__badges span {
                    border: 1px solid rgba(255,255,255,.18);
                    border-radius: 999px;
                    background: rgba(255,255,255,.08);
                    padding: 8px 12px;
                    color: #ffffff;
                    font-size: .82rem;
                    font-weight: 800;
                }
                .woocommerce-checkout .woocommerce form.checkout {
                    display: grid;
                    grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
                    gap: 22px;
                }
                .woocommerce-checkout .woocommerce .col2-set,
                .woocommerce-checkout .woocommerce #order_review_heading,
                .woocommerce-checkout .woocommerce #order_review {
                    float: none !important;
                    width: 100% !important;
                }
                .woocommerce-checkout .woocommerce .col2-set,
                .woocommerce-checkout .woocommerce #order_review {
                    border: 1px solid #ffd1e9;
                    border-radius: 22px;
                    background: #ffffff;
                    padding: 20px;
                    box-shadow: 0 22px 58px -48px rgba(15,23,42,.65);
                }
                .woocommerce-checkout .woocommerce #order_review_heading {
                    grid-column: 2;
                    margin: 0 0 -12px;
                    color: #111827;
                    font-size: 1.25rem;
                    font-weight: 900;
                }
                .woocommerce-checkout .woocommerce #order_review {
                    grid-column: 2;
                }
                .woocommerce-checkout .woocommerce .col2-set {
                    grid-column: 1;
                    grid-row: 1 / span 2;
                }
                .woocommerce-checkout .woocommerce input.input-text,
                .woocommerce-checkout .woocommerce textarea,
                .woocommerce-checkout .woocommerce select {
                    border: 1px solid #f7cfe5 !important;
                    border-radius: 14px !important;
                    padding: 12px 14px !important;
                    background: #fff !important;
                }
                .woocommerce-checkout .woocommerce button.button,
                .woocommerce-checkout .woocommerce #place_order {
                    border: 0 !important;
                    border-radius: 999px !important;
                    background: #F839A9 !important;
                    color: #ffffff !important;
                    font-weight: 900 !important;
                    padding: 14px 22px !important;
                    box-shadow: 0 18px 34px -24px rgba(248,57,169,.95);
                }
                .woocommerce-checkout .woocommerce a {
                    color: #F839A9 !important;
                }
                @media (max-width: 900px) {
                    .woocommerce-checkout .entry-content > .woocommerce {
                        padding: 14px;
                        border-radius: 20px;
                    }
                    .woocommerce-checkout .woocommerce form.checkout {
                        display: block;
                    }
                    .woocommerce-checkout .woocommerce .col2-set,
                    .woocommerce-checkout .woocommerce #order_review_heading,
                    .woocommerce-checkout .woocommerce #order_review {
                        margin-top: 16px;
                    }
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
            $cart_item_data = array();

            if (! empty($payload['community_price_override']) && is_array($payload['community_price_override'])) {
                $override = $payload['community_price_override'];
                $override_amount = isset($override['amount']) ? (float) $override['amount'] : 0;

                if ($override_amount >= 0) {
                    $cart_item_data['worldnew_community_price_override'] = array(
                        'amount' => number_format($override_amount, 2, '.', ''),
                        'source' => ! empty($override['source']) ? sanitize_text_field((string) $override['source']) : 'community',
                    );
                    $cart_item_data['worldnew_unique_key'] = md5($token . '|' . $product_id . '|' . $override_amount);
                }
            }

            WC()->cart->empty_cart();

            $cart_added = WC()->cart->add_to_cart(
                $product_id,
                1,
                $variation_id > 0 ? $variation_id : 0,
                array(),
                $cart_item_data
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
                    .worldnew-account-dashboard { margin: 1.5rem 0; padding: 1.2rem; border-radius: 20px; background: linear-gradient(180deg, #ffffff 0%, #fff0f8 100%); color: #0f172a; box-shadow: 0 24px 55px -35px rgba(248, 57, 169, .3); border: 1px solid #f7c8e4; }
                    .worldnew-account-dashboard * { box-sizing: border-box; }
                    .worldnew-account-dashboard__top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
                    .worldnew-account-dashboard__title { margin: 0; font-size: 1.3rem; color: #0f172a; }
                    .worldnew-account-dashboard__subtitle { margin: .35rem 0 0; color: #F839A9; font-size: .88rem; letter-spacing: .03em; text-transform: uppercase; }
                    .worldnew-account-dashboard__actions { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
                    .worldnew-account-dashboard__btn { border: 1px solid #f7c8e4; border-radius: 999px; padding: .55rem 1rem; color: #0f172a !important; text-decoration: none !important; font-weight: 700; font-size: .88rem; background: #fff; display: inline-flex; align-items: center; justify-content: center; line-height: 1.2; white-space: nowrap; }
                    .worldnew-account-dashboard__btn:hover { border-color: #F839A9; color: #F839A9 !important; text-decoration: none !important; }
                    .worldnew-account-dashboard__btn--primary { background: linear-gradient(135deg, #F839A9, #d91f87); border-color: transparent; color: #ffffff !important; min-width: 200px; }
                    .worldnew-account-dashboard__btn--primary:hover { color: #ffffff !important; border-color: transparent; text-decoration: none !important; filter: brightness(0.95); }
                    .woocommerce-account .woocommerce .worldnew-account-dashboard a.worldnew-account-dashboard__btn--primary,
                    .woocommerce-account .woocommerce .worldnew-account-dashboard a.worldnew-account-dashboard__btn--primary:hover,
                    .woocommerce-account .woocommerce .worldnew-account-dashboard a.worldnew-account-dashboard__btn--primary:focus { color: #ffffff !important; text-decoration: none !important; }
                    .worldnew-account-dashboard__stats { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom: 1rem; }
                    .worldnew-account-dashboard__stat { border: 1px solid #f7c8e4; border-radius: 14px; padding: .8rem; background: #fff; }
                    .worldnew-account-dashboard__kicker { display: block; color: #F839A9; font-size: .76rem; text-transform: uppercase; letter-spacing: .07em; margin-bottom: .35rem; }
                    .worldnew-account-dashboard__value { display: block; color: #0f172a; font-size: 1rem; font-weight: 700; }
                    .worldnew-account-dashboard__section-title { color: #0f172a; margin: 1rem 0 .65rem; font-size: 1rem; }
                    .worldnew-account-dashboard__table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid #f7c8e4; background: #fff; }
                    .worldnew-account-dashboard__table { width: 100%; border-collapse: collapse; min-width: 560px; }
                    .worldnew-account-dashboard__table th, .worldnew-account-dashboard__table td { padding: .72rem .8rem; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: .86rem; color: #334155; }
                    .worldnew-account-dashboard__table th { color: #F839A9; font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
                    .worldnew-account-dashboard__table tr:last-child td { border-bottom: none; }
                    .worldnew-account-dashboard__empty { margin: 0; padding: .9rem; border-radius: 12px; background: #fff7fc; border: 1px dashed #f7c8e4; color: #475569; }
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
            $use_community_price = ! empty($validated['use_community_price']);
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
            $checkout_payload = array(
                'user_id'      => (int) $user->ID,
                'product_id'   => $product_id,
                'variation_id' => $variation_id > 0 ? $variation_id : 0,
                'gift_context' => $gift_context,
            );

            if ($use_community_price) {
                $community_price_override = $this->get_community_price_override_for_product($variation_id > 0 ? $variation_id : $product_id);

                if (! $community_price_override && $variation_id > 0) {
                    $community_price_override = $this->get_community_price_override_for_product($product_id);
                }

                if ($community_price_override) {
                    $checkout_payload['community_price_override'] = $community_price_override;
                }
            }

            set_transient(
                'worldnew_bridge_checkout_' . $token,
                $checkout_payload,
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

        public function register_worldnew_music_product_data_tab($tabs) {
            $tabs['worldnew_tracks'] = array(
                'label'    => 'Tracks',
                'target'   => 'worldnew_tracks_product_data',
                'class'    => array(),
                'priority' => 65,
            );
            $tabs['worldnew_albums'] = array(
                'label'    => 'Albums',
                'target'   => 'worldnew_albums_product_data',
                'class'    => array(),
                'priority' => 66,
            );
            $tabs['worldnew_videos'] = array(
                'label'    => 'Videos',
                'target'   => 'worldnew_videos_product_data',
                'class'    => array(),
                'priority' => 67,
            );
            $tabs['worldnew_lovebox'] = array(
                'label'    => 'Lovebox',
                'target'   => 'worldnew_lovebox_product_data',
                'class'    => array(),
                'priority' => 68,
            );

            return $tabs;
        }

        public function render_worldnew_music_product_data_panel() {
            global $post;
            ?>
            <div id="worldnew_tracks_product_data" class="panel woocommerce_options_panel hidden">
                <?php $this->render_music_product_download_options('track'); ?>
            </div>
            <div id="worldnew_albums_product_data" class="panel woocommerce_options_panel hidden">
                <?php $this->render_music_product_download_options('album'); ?>
            </div>
            <div id="worldnew_videos_product_data" class="panel woocommerce_options_panel hidden">
                <?php $this->render_video_product_data_panel(); ?>
            </div>
            <div id="worldnew_lovebox_product_data" class="panel woocommerce_options_panel hidden">
                <?php if ($post) { $this->render_lovebox_product_metabox($post); } ?>
            </div>
            <?php
        }

        public function render_music_product_download_options($section = 'all') {
            global $post;

            if (! $post || 'product' !== $post->post_type) {
                return;
            }

            $is_album_section = 'album' === $section;
            $is_track_section = 'track' === $section;

            wp_nonce_field('worldnew_music_product_meta', 'worldnew_music_product_meta_nonce');

            $is_music = get_post_meta($post->ID, '_worldnew_music_enabled', true) === 'yes';
            $is_featured = get_post_meta($post->ID, '_worldnew_music_featured', true) === 'yes';
            $show_on_website = 'no' !== get_post_meta($post->ID, '_worldnew_music_show_on_website', true);
            $show_on_community = 'no' !== get_post_meta($post->ID, '_worldnew_music_show_on_community', true);
            $album_show_on_community = get_post_meta($post->ID, '_worldnew_album_show_on_community', true) === 'yes';
            $album_community_playback_mode = (string) get_post_meta($post->ID, '_worldnew_album_community_playback_mode', true);
            if (! in_array($album_community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $album_community_playback_mode = 'preview';
            }
            $community_playback_mode = (string) get_post_meta($post->ID, '_worldnew_music_community_playback_mode', true);
            if (! in_array($community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $community_playback_mode = 'preview';
            }
            $album_community_playback_mode = (string) get_post_meta($post->ID, '_worldnew_album_community_playback_mode', true);
            if (! in_array($album_community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $album_community_playback_mode = $community_playback_mode;
            }
            $artist = get_post_meta($post->ID, '_worldnew_music_artist', true);
            $genre = get_post_meta($post->ID, '_worldnew_music_genre', true);
            $duration = get_post_meta($post->ID, '_worldnew_music_duration', true);
            $preview_seconds = (int) get_post_meta($post->ID, '_worldnew_music_preview_seconds', true);
            $preview_start_seconds = (int) get_post_meta($post->ID, '_worldnew_music_preview_start_seconds', true);
            $preview_end_seconds = (int) get_post_meta($post->ID, '_worldnew_music_preview_end_seconds', true);
            $music_community_price = (string) get_post_meta($post->ID, '_worldnew_music_community_price', true);
            $album_community_price = (string) get_post_meta($post->ID, '_worldnew_album_community_price', true);
            $album_enable_offer_price = get_post_meta($post->ID, '_worldnew_album_enable_offer_price', true) === 'yes';
            $album_minimum_offer_price = (string) get_post_meta($post->ID, '_worldnew_album_minimum_offer_price', true);
            $album_enable_donation = get_post_meta($post->ID, '_worldnew_album_enable_donation', true) === 'yes';
            $album_allow_individual_track_sales = get_post_meta($post->ID, '_worldnew_album_allow_individual_track_sales', true) === 'yes';
            $album_package_mode = (string) get_post_meta($post->ID, '_worldnew_album_package_mode', true);
            $album_package_zip_url = (string) get_post_meta($post->ID, '_worldnew_album_package_zip_url', true);
            $album_tracklist_pdf_url = (string) get_post_meta($post->ID, '_worldnew_album_tracklist_pdf_url', true);
            $album_thankyou_pdf_url = (string) get_post_meta($post->ID, '_worldnew_album_thankyou_pdf_url', true);
            $album_itunes_guide_pdf_url = (string) get_post_meta($post->ID, '_worldnew_album_itunes_guide_pdf_url', true);
            $album_tracks = $this->get_album_package_tracks($post->ID);
            if (! in_array($album_package_mode, array('existing_tracks', 'zip_package'), true)) {
                $album_package_mode = ! empty(get_post_meta($post->ID, '_worldnew_album_track_product_ids', true)) ? 'existing_tracks' : 'zip_package';
            }
            ?>
            <style>
                #woocommerce-product-data .worldnew-music-download-options,
                #woocommerce-product-data .worldnew-video-options {
                    padding: 14px 20px 18px;
                    clear: none;
                    box-sizing: border-box;
                    width: auto;
                    max-width: 100%;
                    overflow: visible;
                }
                #woocommerce-product-data #worldnew_tracks_product_data,
                #woocommerce-product-data #worldnew_albums_product_data,
                #woocommerce-product-data #worldnew_videos_product_data,
                #woocommerce-product-data #worldnew_lovebox_product_data {
                    box-sizing: border-box;
                    float: right;
                    margin-left: 0;
                    min-height: 260px;
                    overflow: visible;
                    width: 80%;
                }
                #woocommerce-product-data #worldnew_lovebox_product_data {
                    padding: 14px 20px 18px;
                }
                @media (max-width: 782px) {
                    #woocommerce-product-data #worldnew_tracks_product_data,
                    #woocommerce-product-data #worldnew_albums_product_data,
                    #woocommerce-product-data #worldnew_videos_product_data,
                    #woocommerce-product-data #worldnew_lovebox_product_data {
                        float: none;
                        margin-left: 0;
                        width: 100%;
                    }
                    #woocommerce-product-data .worldnew-music-download-options,
                    #woocommerce-product-data .worldnew-video-options {
                        padding-left: 12px;
                        padding-right: 12px;
                    }
                }
                #woocommerce-product-data .worldnew-music-download-options *,
                #woocommerce-product-data .worldnew-video-options *,
                #woocommerce-product-data #worldnew_lovebox_product_data * {
                    box-sizing: border-box;
                }
                #woocommerce-product-data .worldnew-music-download-options p {
                    margin: 0 0 12px;
                    padding: 0 !important;
                }
                #woocommerce-product-data .worldnew-music-download-options label {
                    float: none !important;
                    width: auto !important;
                    margin: 0 !important;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    line-height: 1.4;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-music-section-note {
                    display: block;
                    margin-top: 4px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-music-fieldset {
                    max-width: min(980px, 100%);
                    border: 1px solid #dcdcde;
                    border-radius: 10px;
                    padding: 12px;
                    margin: 12px 0;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-music-fieldset p:last-child {
                    margin-bottom: 0;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-music-text-field label {
                    display: block;
                    margin-bottom: 6px !important;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-music-text-field input {
                    max-width: 600px;
                    width: 100%;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-package-fieldset {
                    max-width: min(980px, 100%);
                    overflow: visible;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-mode-grid {
                    display: ;
                    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                    gap: 12px;
                    margin: 10px 0 14px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-mode-card {
                    display: block !important;
                    border: 1px solid #dcdcde;
                    border-radius: 12px;
                    padding: 12px;
                    background: #fff;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-mode-card input {
                    margin-right: 8px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-mode-card span {
                    display: block;
                    margin-top: 6px;
                    color: #646970;
                    font-size: 12px;
                    line-height: 1.45;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-package-grid {
                    display: ;
                    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
                    gap: 12px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-mode-panel {
                    border: 1px solid #dcdcde;
                    border-radius: 12px;
                    background: #fff;
                    margin: 12px 0;
                    padding: 12px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-package-input-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 8px;
                    align-items: end;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table-wrap {
                    width: 50%;
                    overflow-x: scroll!important;
                    border: 1px solid #dcdcde;
                    border-radius: 10px;
                    background: #fff;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table {
                    min-width: 500px;
                    width: 100%;
                    border-collapse: collapse;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table th,
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table td {
                    padding: 8px;
                    border-bottom: 1px solid #dcdcde;
                    vertical-align: top;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table th {
                    text-align: left;
                    font-size: 12px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table input {
                    width: 100%;
                    min-width: 0;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table th:nth-child(2),
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table td:nth-child(2) {
                    min-width: 190px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table th:nth-child(3),
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table td:nth-child(3) {
                    min-width: 170px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table .worldnew-album-track-preview-input {
                    width: 82px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-table .worldnew-album-track-preview-window-input {
                    width: 86px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-file-cell {
                    min-width: 210px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-file-controls {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 6px;
                }
                #woocommerce-product-data .worldnew-music-download-options .worldnew-album-track-actions {
                    white-space: nowrap;
                }
            </style>
            <div class="options_group worldnew-music-download-options">
                <p class="form-field worldnew-music-heading">
                    <strong><?php echo $is_album_section ? 'World New Album' : 'World New Track'; ?></strong>
                    <span class="description worldnew-music-section-note"><?php echo $is_album_section ? 'Use this tab for album products and bundle/ZIP packaging. Product image is used as album artwork.' : 'Use this tab for single-track products. The WooCommerce downloadable file is used as the audio source.'; ?></span>
                </p>
            <?php if ($is_track_section) : ?>
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
            <?php endif; ?>
            <?php if ($is_track_section) : ?>
            <fieldset class="worldnew-music-fieldset">
                <legend><strong>Display locations</strong></legend>
                <p style="margin-top:8px;">
                    <label>
                        <input type="checkbox" name="worldnew_music_show_on_website" value="yes" <?php checked($show_on_website); ?> />
                        Show on WordPress website
                    </label>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="worldnew_music_show_on_community" value="yes" <?php checked($show_on_community); ?> />
                        Show in community app
                    </label>
                </p>
            </fieldset>
            <fieldset class="worldnew-music-fieldset">
                <legend><strong>Community playback</strong></legend>
                <p style="margin-top:8px;">
                    <label>
                        <input type="radio" name="worldnew_music_community_playback_mode" value="preview" <?php checked($community_playback_mode, 'preview'); ?> />
                        30 second preview for everyone
                    </label>
                </p>
                <p>
                    <label>
                        <input type="radio" name="worldnew_music_community_playback_mode" value="full" <?php checked($community_playback_mode, 'full'); ?> />
                        Full stream in community
                    </label>
                </p>
                <p>
                    <label>
                        <input type="radio" name="worldnew_music_community_playback_mode" value="members_full" <?php checked($community_playback_mode, 'members_full'); ?> />
                        Preview for free members, full stream for paid members
                    </label>
                </p>
            </fieldset>
            <fieldset class="worldnew-music-fieldset">
                <legend><strong>Community track offer</strong></legend>
                <p class="description" style="margin-top:8px;">Optional. Community members see and checkout with this price. Leave blank to use the normal WooCommerce price.</p>
                <p class="worldnew-music-text-field">
                    <label for="worldnew_music_community_price"><strong>Community price override</strong></label><br />
                    <input type="text" id="worldnew_music_community_price" name="worldnew_music_community_price" value="<?php echo esc_attr($music_community_price); ?>" class="widefat" placeholder="e.g. 0.99" />
                </p>
            </fieldset>
            <?php endif; ?>
            <?php if ($is_album_section) : ?>
            <fieldset class="worldnew-music-fieldset">
                <legend><strong>Album visibility</strong></legend>
                <p style="margin-top:8px;">
                    <label>
                        <input type="checkbox" name="worldnew_album_show_on_community" value="yes" <?php checked($album_show_on_community); ?> />
                        Show this album in the community app
                    </label>
                </p>
                <p class="description" style="margin:0;">Used for products in the <code>album</code> category. The website album page still renders from the normal product URL.</p>
            </fieldset>
            <fieldset class="worldnew-music-fieldset">
                <legend><strong>Community album playback</strong></legend>
                <p style="margin-top:8px;">
                    <label>
                        <input type="radio" name="worldnew_album_community_playback_mode" value="preview" <?php checked($album_community_playback_mode, 'preview'); ?> />
                        Preview for everyone
                    </label>
                </p>
                <p>
                    <label>
                        <input type="radio" name="worldnew_album_community_playback_mode" value="full" <?php checked($album_community_playback_mode, 'full'); ?> />
                        Full stream in community
                    </label>
                </p>
                <p>
                    <label>
                        <input type="radio" name="worldnew_album_community_playback_mode" value="members_full" <?php checked($album_community_playback_mode, 'members_full'); ?> />
                        Preview for free members, full stream for paid members
                    </label>
                </p>
            </fieldset>
            <fieldset class="worldnew-music-fieldset worldnew-album-package-fieldset">
                <legend><strong>Album package</strong></legend>
                <p class="description" style="margin-top:8px;">Choose one album source so the purchase and preview rules stay clear.</p>
                <div class="worldnew-album-mode-grid" role="radiogroup" aria-label="Album source">
                    <label class="worldnew-album-mode-card" title="Best when each track already exists as its own product. Tracks remain individually purchasable and can also appear inside this album.">
                        <input type="radio" name="worldnew_album_package_mode" value="existing_tracks" <?php checked($album_package_mode, 'existing_tracks'); ?> />
                        <strong>Use bundled track products</strong>
                        <span>Best when tracks already exist as products and can also be sold one by one. <br/> This switches the product to a bundle; choose tracks in the WooCommerce Bundled Products tab.</span>
                    </label>
                    <label class="worldnew-album-mode-card" style="margin-top:14px" title="Best when the album is sold as one download bundle. Tracks can stream in the album, but are not individually purchasable from this setup.">
                        <input type="radio" name="worldnew_album_package_mode" value="zip_package" <?php checked($album_package_mode, 'zip_package'); ?> />
                        <strong>Use one album ZIP/manual files</strong>
                        <span>Best for one packaged album download. Add the ZIP and optional manual track rows; <br/> those tracks are not standalone products.</span>
                    </label>
                </div>
                <div class="worldnew-album-mode-panel worldnew-album-bundle-mode-panel">
                    <p><strong>Bundled product album</strong></p>
                    <p class="description">Save or update this product, then use the WooCommerce <strong>Bundled Products</strong> tab to choose the existing track products and their order. Those child products stay individually purchasable and are also used for the community/website album tracklist.</p>
                </div>
                <div class="worldnew-album-zip-mode-panel">
                <div class="worldnew-album-package-grid">
                    <?php
                    $album_asset_fields = array(
                        'worldnew_album_package_zip_url' => array('label' => 'Album ZIP download', 'value' => $album_package_zip_url, 'type' => 'application/zip'),
                        'worldnew_album_tracklist_pdf_url' => array('label' => 'Tracklist PDF', 'value' => $album_tracklist_pdf_url, 'type' => 'application/pdf'),
                        'worldnew_album_thankyou_pdf_url' => array('label' => 'Thank-you PDF', 'value' => $album_thankyou_pdf_url, 'type' => 'application/pdf'),
                        'worldnew_album_itunes_guide_pdf_url' => array('label' => 'iTunes guide PDF', 'value' => $album_itunes_guide_pdf_url, 'type' => 'application/pdf'),
                    );
                    foreach ($album_asset_fields as $field_name => $field) :
                    ?>
                        <p class="worldnew-music-text-field">
                            <label for="<?php echo esc_attr($field_name); ?>"><strong><?php echo esc_html($field['label']); ?></strong></label>
                            <span class="worldnew-album-package-input-row">
                                <input
                                    type="url"
                                    id="<?php echo esc_attr($field_name); ?>"
                                    name="<?php echo esc_attr($field_name); ?>"
                                    value="<?php echo esc_attr($field['value']); ?>"
                                    class="widefat worldnew-album-file-url"
                                    data-worldnew-library-type="<?php echo esc_attr($field['type']); ?>"
                                    placeholder="https://..."
                                />
                                <button type="button" class="button worldnew-select-album-file">Select</button>
                            </span>
                        </p>
                    <?php endforeach; ?>
                </div>

                <p style="margin-top:14px;"><strong>Ordered album tracks</strong></p>
                <div class="worldnew-album-track-table-wrap" style="overflow-x: scroll;">
                    <table class="worldnew-album-track-table">
                        <thead>
                            <tr>
                                <th style="width:52px;">#</th>
                                <th>Title</th>
                                <th>Artist</th>
                        <th style="width:108px;">Duration</th>
                        <th style="width:110px;">Preview sec</th>
                        <th style="width:112px;">Preview from</th>
                        <th style="width:112px;">Preview to</th>
                        <th>Web file</th>
                        <th>iTunes-ready file</th>
                                <th style="width:92px;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="worldnewAlbumTrackRows">
                            <?php foreach ($album_tracks as $index => $track) : ?>
                                <?php $row_index = (int) $index; ?>
                                <tr class="worldnew-album-track-admin-row" data-index="<?php echo esc_attr((string) $row_index); ?>">
                                    <td><input type="number" min="1" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][position]" value="<?php echo esc_attr((string) (! empty($track['position']) ? (int) $track['position'] : $row_index + 1)); ?>" /></td>
                                    <td><input type="text" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][title]" value="<?php echo esc_attr($track['title']); ?>" placeholder="Track title" /></td>
                                    <td><input type="text" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][artist]" value="<?php echo esc_attr($track['artist']); ?>" placeholder="Artist" /></td>
                                    <td><input type="text" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][duration]" value="<?php echo esc_attr($track['duration']); ?>" placeholder="3:45" /></td>
                                    <td><input class="worldnew-album-track-preview-input" type="number" min="5" max="600" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][preview_seconds]" value="<?php echo esc_attr((string) (! empty($track['preview_seconds']) ? (int) $track['preview_seconds'] : 30)); ?>" /></td>
                                    <td><input class="worldnew-album-track-preview-window-input" type="number" min="0" max="86400" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][preview_start_seconds]" value="<?php echo esc_attr((string) (! empty($track['preview_start_seconds']) ? (int) $track['preview_start_seconds'] : 0)); ?>" placeholder="0" /></td>
                                    <td><input class="worldnew-album-track-preview-window-input" type="number" min="0" max="86400" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][preview_end_seconds]" value="<?php echo esc_attr((string) (! empty($track['preview_end_seconds']) ? (int) $track['preview_end_seconds'] : 0)); ?>" placeholder="Auto" /></td>
                                    <td class="worldnew-album-track-file-cell"><span class="worldnew-album-track-file-controls"><input type="url" class="worldnew-album-file-url" data-worldnew-library-type="audio" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][web_file_url]" value="<?php echo esc_attr($track['web_file_url']); ?>" placeholder="https://..." /><button type="button" class="button worldnew-select-album-file">Select</button></span></td>
                                    <td class="worldnew-album-track-file-cell"><span class="worldnew-album-track-file-controls"><input type="url" class="worldnew-album-file-url" data-worldnew-library-type="audio" name="worldnew_album_tracks[<?php echo esc_attr((string) $row_index); ?>][itunes_file_url]" value="<?php echo esc_attr($track['itunes_file_url']); ?>" placeholder="https://..." /><button type="button" class="button worldnew-select-album-file">Select</button></span></td>
                                    <td class="worldnew-album-track-actions"><button type="button" class="button worldnew-remove-album-track">Remove</button></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <p style="margin-top:10px;">
                    <button type="button" class="button" id="worldnewAddAlbumTrack">Add album track</button>
                </p>
                </div>
            </fieldset>
            <fieldset class="worldnew-music-fieldset">
                <legend><strong>Community album offer</strong></legend>
                <p class="description" style="margin-top:8px;">Optional community-specific selling rules. Leave blank to use the normal WooCommerce product price and purchase page.</p>
                <p class="worldnew-music-text-field">
                    <label for="worldnew_album_community_price"><strong>Community price override</strong></label><br />
                    <input type="text" id="worldnew_album_community_price" name="worldnew_album_community_price" value="<?php echo esc_attr($album_community_price); ?>" class="widefat" placeholder="e.g. 5.00" />
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="worldnew_album_enable_offer_price" value="yes" <?php checked($album_enable_offer_price); ?> />
                        Enable offer-your-price for community listeners
                    </label>
                </p>
                <p class="worldnew-music-text-field">
                    <label for="worldnew_album_minimum_offer_price"><strong>Minimum offer price</strong></label><br />
                    <input type="text" id="worldnew_album_minimum_offer_price" name="worldnew_album_minimum_offer_price" value="<?php echo esc_attr($album_minimum_offer_price); ?>" class="widefat" placeholder="e.g. 5.00" />
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="worldnew_album_enable_donation" value="yes" <?php checked($album_enable_donation); ?> />
                        Allow free/donation-led community access
                    </label>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="worldnew_album_allow_individual_track_sales" value="yes" <?php checked($album_allow_individual_track_sales); ?> />
                        Allow individual track purchases from this album
                    </label>
                </p>
            </fieldset>
            <?php endif; ?>
            <?php if ($is_track_section) : ?>
            <p class="worldnew-music-text-field">
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
            <p class="worldnew-music-text-field">
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
            <p class="worldnew-music-text-field">
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
            <p class="worldnew-music-text-field">
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
            <div class="worldnew-album-package-grid">
                <p class="worldnew-music-text-field">
                    <label for="worldnew_music_preview_start_seconds"><strong>Preview starts at second</strong></label><br />
                    <input
                        type="number"
                        min="0"
                        max="86400"
                        id="worldnew_music_preview_start_seconds"
                        name="worldnew_music_preview_start_seconds"
                        value="<?php echo esc_attr((string) max(0, $preview_start_seconds)); ?>"
                        class="widefat"
                        placeholder="0"
                    />
                </p>
                <p class="worldnew-music-text-field">
                    <label for="worldnew_music_preview_end_seconds"><strong>Preview ends at second</strong> (optional)</label><br />
                    <input
                        type="number"
                        min="0"
                        max="86400"
                        id="worldnew_music_preview_end_seconds"
                        name="worldnew_music_preview_end_seconds"
                        value="<?php echo esc_attr((string) max(0, $preview_end_seconds)); ?>"
                        class="widefat"
                        placeholder="Auto from preview seconds"
                    />
                </p>
            </div>
            <?php endif; ?>
            </div>
            <?php if ($is_album_section) : ?>
            <script type="text/html" id="worldnew-album-track-template">
                <tr class="worldnew-album-track-admin-row" data-index="__INDEX__">
                    <td><input type="number" min="1" name="worldnew_album_tracks[__INDEX__][position]" value="__POSITION__" /></td>
                    <td><input type="text" name="worldnew_album_tracks[__INDEX__][title]" value="" placeholder="Track title" /></td>
                    <td><input type="text" name="worldnew_album_tracks[__INDEX__][artist]" value="" placeholder="Artist" /></td>
                    <td><input type="text" name="worldnew_album_tracks[__INDEX__][duration]" value="" placeholder="3:45" /></td>
                    <td><input class="worldnew-album-track-preview-input" type="number" min="5" max="600" name="worldnew_album_tracks[__INDEX__][preview_seconds]" value="30" /></td>
                    <td><input class="worldnew-album-track-preview-window-input" type="number" min="0" max="86400" name="worldnew_album_tracks[__INDEX__][preview_start_seconds]" value="0" placeholder="0" /></td>
                    <td><input class="worldnew-album-track-preview-window-input" type="number" min="0" max="86400" name="worldnew_album_tracks[__INDEX__][preview_end_seconds]" value="" placeholder="Auto" /></td>
                    <td class="worldnew-album-track-file-cell"><span class="worldnew-album-track-file-controls"><input type="url" class="worldnew-album-file-url" data-worldnew-library-type="audio" name="worldnew_album_tracks[__INDEX__][web_file_url]" value="" placeholder="https://..." /><button type="button" class="button worldnew-select-album-file">Select</button></span></td>
                    <td class="worldnew-album-track-file-cell"><span class="worldnew-album-track-file-controls"><input type="url" class="worldnew-album-file-url" data-worldnew-library-type="audio" name="worldnew_album_tracks[__INDEX__][itunes_file_url]" value="" placeholder="https://..." /><button type="button" class="button worldnew-select-album-file">Select</button></span></td>
                    <td class="worldnew-album-track-actions"><button type="button" class="button worldnew-remove-album-track">Remove</button></td>
                </tr>
            </script>
            <script>
                (function(){
                    const rows = document.getElementById('worldnewAlbumTrackRows');
                    const addButton = document.getElementById('worldnewAddAlbumTrack');
                    const template = document.getElementById('worldnew-album-track-template');
                    if (!rows || !addButton || !template) return;
                    const modeInputs = document.querySelectorAll('input[name="worldnew_album_package_mode"]');
                    const bundlePanel = document.querySelector('.worldnew-album-bundle-mode-panel');
                    const zipPanel = document.querySelector('.worldnew-album-zip-mode-panel');
                    const productTypeSelect = document.getElementById('product-type');

                    let nextIndex = Array.from(rows.querySelectorAll('.worldnew-album-track-admin-row')).reduce((highest, row) => {
                        return Math.max(highest, Number(row.getAttribute('data-index') || 0));
                    }, -1) + 1;

                    function getMode() {
                        const checked = document.querySelector('input[name="worldnew_album_package_mode"]:checked');
                        return checked ? checked.value : 'zip_package';
                    }

                    function setProductTypeForBundleMode(mode) {
                        if (!productTypeSelect || mode !== 'existing_tracks') return;
                        const bundleOption = productTypeSelect.querySelector('option[value="bundle"]') || productTypeSelect.querySelector('option[value="woosb"]');
                        if (!bundleOption) return;
                        productTypeSelect.value = bundleOption.value;
                        productTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    function syncAlbumModePanels() {
                        const mode = getMode();
                        if (bundlePanel) {
                            bundlePanel.style.display = mode === 'existing_tracks' ? 'block' : 'none';
                        }
                        if (zipPanel) {
                            zipPanel.style.display = mode === 'zip_package' ? 'block' : 'none';
                        }
                        setProductTypeForBundleMode(mode);
                    }

                    function openMedia(input) {
                        if (typeof wp === 'undefined' || !wp.media || !input) return;
                        const libraryType = input.getAttribute('data-worldnew-library-type') || '';
                        const frame = wp.media({
                            title: 'Select album file',
                            button: { text: 'Use file' },
                            library: libraryType ? { type: libraryType } : undefined,
                            multiple: false
                        });

                        frame.on('select', () => {
                            const attachment = frame.state().get('selection').first().toJSON();
                            input.value = attachment.url || '';
                        });

                        frame.open();
                    }

                    function bindRow(row) {
                        row.querySelectorAll('.worldnew-select-album-file').forEach((button) => {
                            button.addEventListener('click', () => {
                                const input = button.parentElement ? button.parentElement.querySelector('.worldnew-album-file-url') : null;
                                openMedia(input);
                            });
                        });

                        const removeButton = row.querySelector('.worldnew-remove-album-track');
                        if (removeButton) {
                            removeButton.addEventListener('click', () => row.remove());
                        }
                    }

                    document.querySelectorAll('.worldnew-album-package-input-row .worldnew-select-album-file').forEach((button) => {
                        button.addEventListener('click', () => {
                            const input = button.parentElement ? button.parentElement.querySelector('.worldnew-album-file-url') : null;
                            openMedia(input);
                        });
                    });

                    rows.querySelectorAll('.worldnew-album-track-admin-row').forEach(bindRow);
                    modeInputs.forEach((input) => input.addEventListener('change', syncAlbumModePanels));
                    syncAlbumModePanels();
                    addButton.addEventListener('click', () => {
                        const index = nextIndex;
                        nextIndex += 1;
                        const wrapper = document.createElement('tbody');
                        wrapper.innerHTML = template.innerHTML
                            .replaceAll('__INDEX__', String(index))
                            .replaceAll('__POSITION__', String(rows.querySelectorAll('.worldnew-album-track-admin-row').length + 1))
                            .trim();
                        const row = wrapper.firstElementChild;
                        rows.appendChild(row);
                        bindRow(row);
                    });
                })();
            </script>
            <?php endif; ?>
            <?php
        }

        public function render_video_product_data_panel() {
            global $post;

            if (! $post || 'product' !== $post->post_type) {
                return;
            }

            wp_nonce_field('worldnew_video_product_meta', 'worldnew_video_product_meta_nonce');

            $enabled = get_post_meta($post->ID, '_worldnew_video_enabled', true) === 'yes';
            $show_on_community = get_post_meta($post->ID, '_worldnew_video_show_on_community', true) === 'yes';
            $community_category = (string) get_post_meta($post->ID, '_worldnew_video_community_category', true);
            if (! in_array($community_category, array('movies', 'reels', 'mixtapes', 'behind-the-scenes'), true)) {
                $community_category = 'behind-the-scenes';
            }
            $playback_mode = (string) get_post_meta($post->ID, '_worldnew_video_community_playback_mode', true);
            if (! in_array($playback_mode, array('full', 'members_full'), true)) {
                $playback_mode = 'full';
            }
            $preview_seconds = (int) get_post_meta($post->ID, '_worldnew_video_preview_seconds', true);
            $preview_start_seconds = (int) get_post_meta($post->ID, '_worldnew_video_preview_start_seconds', true);
            $preview_end_seconds = (int) get_post_meta($post->ID, '_worldnew_video_preview_end_seconds', true);
            $stream_url = (string) get_post_meta($post->ID, '_worldnew_video_stream_url', true);
            $poster_url = (string) get_post_meta($post->ID, '_worldnew_video_poster_url', true);
            ?>
            <div class="options_group worldnew-video-options">
                <p class="form-field">
                    <strong>World New Video</strong>
                    <span class="description" style="display:block;margin-top:4px;">Use this tab for products in the <code>videos</code> category. The product downloadable video file is used as the stream source unless you set an override below.</span>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="worldnew_video_enabled" value="yes" <?php checked($enabled); ?> />
                        Mark this WooCommerce product as a community video.
                    </label>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="worldnew_video_show_on_community" value="yes" <?php checked($show_on_community); ?> />
                        Show in community app
                    </label>
                </p>
                <p class="form-field">
                    <label for="worldnew_video_community_category"><strong>Community category</strong></label>
                    <select id="worldnew_video_community_category" name="worldnew_video_community_category">
                        <option value="movies" <?php selected($community_category, 'movies'); ?>>Movies</option>
                        <option value="reels" <?php selected($community_category, 'reels'); ?>>Reels</option>
                        <option value="mixtapes" <?php selected($community_category, 'mixtapes'); ?>>Mixtapes</option>
                        <option value="behind-the-scenes" <?php selected($community_category, 'behind-the-scenes'); ?>>Behind the Scenes</option>
                    </select>
                </p>
                <fieldset class="worldnew-music-fieldset">
                    <legend><strong>Community playback</strong></legend>
                    <p style="margin-top:8px;">
                        <label>
                            <input type="radio" name="worldnew_video_community_playback_mode" value="full" <?php checked($playback_mode, 'full'); ?> />
                            Full stream for all signed-in members
                        </label>
                    </p>
                    <p>
                        <label>
                            <input type="radio" name="worldnew_video_community_playback_mode" value="members_full" <?php checked($playback_mode, 'members_full'); ?> />
                            Preview for free members, full stream for paid members
                        </label>
                    </p>
                </fieldset>
                <p class="form-field">
                    <label for="worldnew_video_preview_seconds"><strong>Preview seconds</strong></label>
                    <input
                        type="number"
                        min="5"
                        max="600"
                        id="worldnew_video_preview_seconds"
                        name="worldnew_video_preview_seconds"
                        value="<?php echo esc_attr((string) ($preview_seconds > 0 ? $preview_seconds : 30)); ?>"
                        class="short"
                    />
                </p>
                <p class="form-field">
                    <label for="worldnew_video_preview_start_seconds"><strong>Preview starts at</strong></label>
                    <input
                        type="number"
                        min="0"
                        max="86400"
                        id="worldnew_video_preview_start_seconds"
                        name="worldnew_video_preview_start_seconds"
                        value="<?php echo esc_attr((string) max(0, $preview_start_seconds)); ?>"
                        class="short"
                    />
                    <span class="description">Optional timestamp in seconds.</span>
                </p>
                <p class="form-field">
                    <label for="worldnew_video_preview_end_seconds"><strong>Preview ends at</strong></label>
                    <input
                        type="number"
                        min="0"
                        max="86400"
                        id="worldnew_video_preview_end_seconds"
                        name="worldnew_video_preview_end_seconds"
                        value="<?php echo esc_attr((string) max(0, $preview_end_seconds)); ?>"
                        class="short"
                    />
                    <span class="description">Leave blank/0 to use preview seconds from the start timestamp.</span>
                </p>
                <p class="form-field">
                    <label for="worldnew_video_stream_url"><strong>Stream URL override</strong></label>
                    <input type="url" id="worldnew_video_stream_url" name="worldnew_video_stream_url" value="<?php echo esc_attr($stream_url); ?>" class="widefat worldnew-video-file-url" data-worldnew-library-type="video" placeholder="Uses downloadable video file by default" />
                    <button type="button" class="button worldnew-select-video-file" style="margin-top:6px;">Select video</button>
                </p>
                <p class="form-field">
                    <label for="worldnew_video_poster_url"><strong>Poster URL override</strong></label>
                    <input type="url" id="worldnew_video_poster_url" name="worldnew_video_poster_url" value="<?php echo esc_attr($poster_url); ?>" class="widefat worldnew-video-file-url" data-worldnew-library-type="image" placeholder="Uses product image by default" />
                    <button type="button" class="button worldnew-select-video-file" style="margin-top:6px;">Select image</button>
                </p>
            </div>
            <script>
                (function(){
                    document.querySelectorAll('.worldnew-select-video-file').forEach(function(button){
                        button.addEventListener('click', function(){
                            if (typeof wp === 'undefined' || !wp.media) return;
                            var input = button.parentElement ? button.parentElement.querySelector('.worldnew-video-file-url') : null;
                            if (!input) return;
                            var libraryType = input.getAttribute('data-worldnew-library-type') || '';
                            var frame = wp.media({
                                title: libraryType === 'image' ? 'Select video poster' : 'Select video file',
                                button: { text: 'Use file' },
                                library: libraryType ? { type: libraryType } : undefined,
                                multiple: false
                            });
                            frame.on('select', function(){
                                var attachment = frame.state().get('selection').first().toJSON();
                                input.value = attachment.url || '';
                            });
                            frame.open();
                        });
                    });
                })();
            </script>
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
            $show_on_website = isset($_POST['worldnew_music_show_on_website']) ? 'yes' : 'no';
            $show_on_community = isset($_POST['worldnew_music_show_on_community']) ? 'yes' : 'no';
            $album_show_on_community = isset($_POST['worldnew_album_show_on_community']) ? 'yes' : 'no';
            $album_community_playback_mode = isset($_POST['worldnew_album_community_playback_mode'])
                ? sanitize_text_field(wp_unslash($_POST['worldnew_album_community_playback_mode']))
                : (string) get_post_meta($post_id, '_worldnew_album_community_playback_mode', true);
            if (! in_array($album_community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $album_community_playback_mode = 'preview';
            }
            $community_playback_mode = isset($_POST['worldnew_music_community_playback_mode'])
                ? sanitize_text_field(wp_unslash($_POST['worldnew_music_community_playback_mode']))
                : (string) get_post_meta($post_id, '_worldnew_music_community_playback_mode', true);
            if (! in_array($community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $community_playback_mode = 'preview';
            }
            $artist = isset($_POST['worldnew_music_artist']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_artist'])) : '';
            $genre = isset($_POST['worldnew_music_genre']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_genre'])) : '';
            $duration = isset($_POST['worldnew_music_duration']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_duration'])) : '';
            $preview_seconds = null;
            if (isset($_POST['worldnew_music_preview_seconds'])) {
                $preview_seconds = max(5, min(600, (int) wp_unslash($_POST['worldnew_music_preview_seconds'])));
            }
            $preview_start_seconds = isset($_POST['worldnew_music_preview_start_seconds']) ? absint(wp_unslash($_POST['worldnew_music_preview_start_seconds'])) : 0;
            $preview_end_seconds = isset($_POST['worldnew_music_preview_end_seconds']) ? absint(wp_unslash($_POST['worldnew_music_preview_end_seconds'])) : 0;
            if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                $preview_end_seconds = 0;
            }
            $music_community_price = isset($_POST['worldnew_music_community_price']) ? sanitize_text_field(wp_unslash($_POST['worldnew_music_community_price'])) : '';
            $album_community_price = isset($_POST['worldnew_album_community_price']) ? sanitize_text_field(wp_unslash($_POST['worldnew_album_community_price'])) : '';
            $album_minimum_offer_price = isset($_POST['worldnew_album_minimum_offer_price']) ? sanitize_text_field(wp_unslash($_POST['worldnew_album_minimum_offer_price'])) : '';
            $album_package_mode = isset($_POST['worldnew_album_package_mode'])
                ? sanitize_text_field(wp_unslash($_POST['worldnew_album_package_mode']))
                : (string) get_post_meta($post_id, '_worldnew_album_package_mode', true);
            if (! in_array($album_package_mode, array('existing_tracks', 'zip_package'), true)) {
                $album_package_mode = 'zip_package';
            }
            $album_package_zip_url = isset($_POST['worldnew_album_package_zip_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_album_package_zip_url'])) : '';
            $album_tracklist_pdf_url = isset($_POST['worldnew_album_tracklist_pdf_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_album_tracklist_pdf_url'])) : '';
            $album_thankyou_pdf_url = isset($_POST['worldnew_album_thankyou_pdf_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_album_thankyou_pdf_url'])) : '';
            $album_itunes_guide_pdf_url = isset($_POST['worldnew_album_itunes_guide_pdf_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_album_itunes_guide_pdf_url'])) : '';
            if ('existing_tracks' === $album_package_mode) {
                $album_package_zip_url = '';
                $album_tracklist_pdf_url = '';
                $album_thankyou_pdf_url = '';
                $album_itunes_guide_pdf_url = '';
            }
            $album_tracks = $this->sanitize_album_package_tracks(
                isset($_POST['worldnew_album_tracks']) && is_array($_POST['worldnew_album_tracks'])
                    ? wp_unslash($_POST['worldnew_album_tracks'])
                    : array()
            );
            $album_track_product_ids = array();
            if (isset($_POST['worldnew_album_track_product_ids']) && is_array($_POST['worldnew_album_track_product_ids'])) {
                $raw_album_track_product_ids = array_map('absint', wp_unslash($_POST['worldnew_album_track_product_ids']));
                $raw_album_track_positions = isset($_POST['worldnew_album_track_product_position']) && is_array($_POST['worldnew_album_track_product_position'])
                    ? array_map('absint', wp_unslash($_POST['worldnew_album_track_product_position']))
                    : array();

                $positioned_track_ids = array();
                foreach ($raw_album_track_product_ids as $raw_track_id) {
                    if ($raw_track_id < 1) {
                        continue;
                    }
                    $positioned_track_ids[] = array(
                        'id'       => $raw_track_id,
                        'position' => ! empty($raw_album_track_positions[$raw_track_id]) ? (int) $raw_album_track_positions[$raw_track_id] : PHP_INT_MAX,
                    );
                }

                usort($positioned_track_ids, function ($left, $right) {
                    if ($left['position'] === $right['position']) {
                        return $left['id'] <=> $right['id'];
                    }

                    return $left['position'] <=> $right['position'];
                });

                foreach ($positioned_track_ids as $track_row) {
                    $album_track_product_ids[] = (int) $track_row['id'];
                }
                $album_track_product_ids = array_values(array_unique($album_track_product_ids));
            }

            update_post_meta($post_id, '_worldnew_music_enabled', $is_music);
            update_post_meta($post_id, '_worldnew_music_featured', $is_featured);
            update_post_meta($post_id, '_worldnew_music_show_on_website', $show_on_website);
            update_post_meta($post_id, '_worldnew_music_show_on_community', $show_on_community);
            update_post_meta($post_id, '_worldnew_album_show_on_community', $album_show_on_community);
            update_post_meta($post_id, '_worldnew_album_community_playback_mode', $album_community_playback_mode);
            update_post_meta($post_id, '_worldnew_music_community_playback_mode', $community_playback_mode);
            if (isset($_POST['worldnew_music_stream_url'])) {
                update_post_meta($post_id, '_worldnew_music_stream_url', esc_url_raw(wp_unslash($_POST['worldnew_music_stream_url'])));
            }
            if (isset($_POST['worldnew_music_cover_url'])) {
                update_post_meta($post_id, '_worldnew_music_cover_url', esc_url_raw(wp_unslash($_POST['worldnew_music_cover_url'])));
            }
            update_post_meta($post_id, '_worldnew_music_artist', $artist);
            update_post_meta($post_id, '_worldnew_music_genre', $genre);
            update_post_meta($post_id, '_worldnew_music_duration', $duration);
            if (null !== $preview_seconds) {
                update_post_meta($post_id, '_worldnew_music_preview_seconds', $preview_seconds);
            }
            update_post_meta($post_id, '_worldnew_music_preview_start_seconds', $preview_start_seconds);
            update_post_meta($post_id, '_worldnew_music_preview_end_seconds', $preview_end_seconds);
            update_post_meta($post_id, '_worldnew_music_community_price', $music_community_price);
            update_post_meta($post_id, '_worldnew_album_community_price', $album_community_price);
            update_post_meta($post_id, '_worldnew_album_enable_offer_price', isset($_POST['worldnew_album_enable_offer_price']) ? 'yes' : 'no');
            update_post_meta($post_id, '_worldnew_album_minimum_offer_price', $album_minimum_offer_price);
            update_post_meta($post_id, '_worldnew_album_enable_donation', isset($_POST['worldnew_album_enable_donation']) ? 'yes' : 'no');
            update_post_meta($post_id, '_worldnew_album_allow_individual_track_sales', isset($_POST['worldnew_album_allow_individual_track_sales']) ? 'yes' : 'no');
            update_post_meta($post_id, '_worldnew_album_package_mode', $album_package_mode);
            update_post_meta($post_id, '_worldnew_album_package_zip_url', $album_package_zip_url);
            update_post_meta($post_id, '_worldnew_album_tracklist_pdf_url', $album_tracklist_pdf_url);
            update_post_meta($post_id, '_worldnew_album_thankyou_pdf_url', $album_thankyou_pdf_url);
            update_post_meta($post_id, '_worldnew_album_itunes_guide_pdf_url', $album_itunes_guide_pdf_url);
            update_post_meta($post_id, '_worldnew_album_track_product_ids', $album_track_product_ids);
            $this->sync_album_product_type_for_package_mode($post_id, $album_package_mode);

            if ('existing_tracks' === $album_package_mode) {
                delete_post_meta($post_id, '_worldnew_album_tracks');
                if (! empty($album_track_product_ids)) {
                    $this->sync_album_tracks_from_product_ids($post_id, $album_track_product_ids);
                }
            } elseif (! empty($album_tracks)) {
                update_post_meta($post_id, '_worldnew_album_tracks', $album_tracks);
            } else {
                delete_post_meta($post_id, '_worldnew_album_tracks');
            }

            $this->sync_album_package_download($post_id, $album_package_zip_url);
        }

        public function save_video_product_meta($post_id, $post, $update) {
            if (! isset($_POST['worldnew_video_product_meta_nonce'])) {
                return;
            }

            if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['worldnew_video_product_meta_nonce'])), 'worldnew_video_product_meta')) {
                return;
            }

            if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
                return;
            }

            if (! current_user_can('edit_post', $post_id)) {
                return;
            }

            $community_category = isset($_POST['worldnew_video_community_category'])
                ? sanitize_text_field(wp_unslash($_POST['worldnew_video_community_category']))
                : 'behind-the-scenes';
            if (! in_array($community_category, array('movies', 'reels', 'mixtapes', 'behind-the-scenes'), true)) {
                $community_category = 'behind-the-scenes';
            }

            $playback_mode = isset($_POST['worldnew_video_community_playback_mode'])
                ? sanitize_text_field(wp_unslash($_POST['worldnew_video_community_playback_mode']))
                : 'full';
            if (! in_array($playback_mode, array('full', 'members_full'), true)) {
                $playback_mode = 'full';
            }

            $preview_seconds = isset($_POST['worldnew_video_preview_seconds']) ? (int) wp_unslash($_POST['worldnew_video_preview_seconds']) : 30;
            $preview_seconds = max(5, min(600, $preview_seconds));
            $preview_start_seconds = isset($_POST['worldnew_video_preview_start_seconds']) ? absint(wp_unslash($_POST['worldnew_video_preview_start_seconds'])) : 0;
            $preview_end_seconds = isset($_POST['worldnew_video_preview_end_seconds']) ? absint(wp_unslash($_POST['worldnew_video_preview_end_seconds'])) : 0;
            if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                $preview_end_seconds = 0;
            }

            update_post_meta($post_id, '_worldnew_video_enabled', isset($_POST['worldnew_video_enabled']) ? 'yes' : 'no');
            update_post_meta($post_id, '_worldnew_video_show_on_community', isset($_POST['worldnew_video_show_on_community']) ? 'yes' : 'no');
            update_post_meta($post_id, '_worldnew_video_community_category', $community_category);
            update_post_meta($post_id, '_worldnew_video_community_playback_mode', $playback_mode);
            update_post_meta($post_id, '_worldnew_video_preview_seconds', $preview_seconds);
            update_post_meta($post_id, '_worldnew_video_preview_start_seconds', $preview_start_seconds);
            update_post_meta($post_id, '_worldnew_video_preview_end_seconds', $preview_end_seconds);
            update_post_meta($post_id, '_worldnew_video_stream_url', isset($_POST['worldnew_video_stream_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_video_stream_url'])) : '');
            update_post_meta($post_id, '_worldnew_video_poster_url', isset($_POST['worldnew_video_poster_url']) ? esc_url_raw(wp_unslash($_POST['worldnew_video_poster_url'])) : '');
        }

        private function sanitize_album_package_tracks($raw_tracks) {
            $tracks = array();

            foreach ((array) $raw_tracks as $index => $track) {
                if (! is_array($track)) {
                    continue;
                }

                $title = isset($track['title']) ? sanitize_text_field((string) $track['title']) : '';
                $web_file_url = isset($track['web_file_url']) ? esc_url_raw((string) $track['web_file_url']) : '';
                $itunes_file_url = isset($track['itunes_file_url']) ? esc_url_raw((string) $track['itunes_file_url']) : '';

                if ('' === $title && '' === $web_file_url && '' === $itunes_file_url) {
                    continue;
                }

                $preview_seconds = isset($track['preview_seconds']) ? absint($track['preview_seconds']) : 30;
                $preview_start_seconds = isset($track['preview_start_seconds']) ? absint($track['preview_start_seconds']) : 0;
                $preview_end_seconds = isset($track['preview_end_seconds']) ? absint($track['preview_end_seconds']) : 0;
                if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                    $preview_end_seconds = 0;
                }
                $position = isset($track['position']) ? absint($track['position']) : ((int) $index + 1);

                $tracks[] = array(
                    'position'              => max(1, $position),
                    'title'                 => $title,
                    'artist'                => isset($track['artist']) ? sanitize_text_field((string) $track['artist']) : '',
                    'duration'              => isset($track['duration']) ? sanitize_text_field((string) $track['duration']) : '',
                    'preview_seconds'       => max(5, min(600, $preview_seconds)),
                    'preview_start_seconds' => $preview_start_seconds,
                    'preview_end_seconds'   => $preview_end_seconds,
                    'web_file_url'          => $web_file_url,
                    'itunes_file_url'       => $itunes_file_url,
                );
            }

            usort($tracks, function ($left, $right) {
                $left_position = isset($left['position']) ? (int) $left['position'] : 0;
                $right_position = isset($right['position']) ? (int) $right['position'] : 0;

                if ($left_position === $right_position) {
                    return 0;
                }

                return $left_position < $right_position ? -1 : 1;
            });

            return array_values($tracks);
        }

        private function get_album_package_tracks($product_id) {
            $tracks = get_post_meta($product_id, '_worldnew_album_tracks', true);

            if (! is_array($tracks)) {
                return array();
            }

            return $this->sanitize_album_package_tracks($tracks);
        }

        /**
         * Builds an ordered album tracklist from existing track products.
         * The source products remain independently purchasable.
         */
        private function sync_album_tracks_from_product_ids($album_id, $track_ids) {
            if (! is_array($track_ids)) {
                return;
            }

            $tracks = array();
            $normalized_ids = array_values(array_unique(array_filter(array_map('absint', $track_ids))));

            foreach ($normalized_ids as $position => $track_id) {
                if ($track_id === (int) $album_id) {
                    continue;
                }

                $track_product = function_exists('wc_get_product') ? wc_get_product($track_id) : null;
                $track_post = get_post($track_id);

                if (! $track_product || ! $track_post || 'product' !== $track_post->post_type) {
                    continue;
                }

                $stream_url = $this->resolve_music_stream_url(
                    $track_product,
                    (string) get_post_meta($track_id, '_worldnew_music_stream_url', true)
                );

                if (! $stream_url) {
                    continue;
                }

                $preview_seconds = max(5, (int) get_post_meta($track_id, '_worldnew_music_preview_seconds', true) ?: 30);
                $preview_start_seconds = max(0, (int) get_post_meta($track_id, '_worldnew_music_preview_start_seconds', true));
                $preview_end_seconds = max(0, (int) get_post_meta($track_id, '_worldnew_music_preview_end_seconds', true));

                $tracks[] = array(
                    'position'              => $position + 1,
                    'title'                 => get_the_title($track_post),
                    'artist'                => (string) get_post_meta($track_id, '_worldnew_music_artist', true),
                    'duration'              => (string) get_post_meta($track_id, '_worldnew_music_duration', true),
                    'preview_seconds'       => $preview_seconds,
                    'preview_start_seconds' => $preview_start_seconds,
                    'preview_end_seconds'   => $preview_end_seconds > $preview_start_seconds ? $preview_end_seconds : 0,
                    'web_file_url'          => $stream_url,
                    'itunes_file_url'       => '',
                );
            }

            update_post_meta($album_id, '_worldnew_album_track_product_ids', $normalized_ids);
            update_post_meta($album_id, '_worldnew_album_tracks', $tracks);
        }

        private function sync_album_product_type_for_package_mode($product_id, $package_mode) {
            if (! taxonomy_exists('product_type')) {
                return;
            }

            $current_terms = wp_get_object_terms($product_id, 'product_type', array('fields' => 'slugs'));
            $current_type = is_array($current_terms) && ! empty($current_terms) ? (string) $current_terms[0] : '';

            if ('existing_tracks' === $package_mode) {
                $bundle_term = get_term_by('slug', 'bundle', 'product_type');
                if (! $bundle_term || is_wp_error($bundle_term)) {
                    $bundle_term = get_term_by('slug', 'woosb', 'product_type');
                }

                if ($bundle_term && ! is_wp_error($bundle_term)) {
                    wp_set_object_terms($product_id, array((int) $bundle_term->term_id), 'product_type');
                }

                return;
            }

            if (in_array($current_type, array('bundle', 'woosb'), true)) {
                $simple_term = get_term_by('slug', 'simple', 'product_type');
                if ($simple_term && ! is_wp_error($simple_term)) {
                    wp_set_object_terms($product_id, array((int) $simple_term->term_id), 'product_type');
                }
            }
        }

        private function sync_album_package_download($product_id, $zip_url) {
            static $syncing = array();

            if (isset($syncing[$product_id]) || ! function_exists('wc_get_product') || ! class_exists('WC_Product_Download')) {
                return;
            }

            $product = wc_get_product($product_id);
            if (! $product || ! method_exists($product, 'get_downloads') || ! method_exists($product, 'set_downloads')) {
                return;
            }

            $syncing[$product_id] = true;
            $download_id = md5('worldnew_album_package_zip_' . (string) $product_id);
            $downloads = $product->get_downloads('edit');

            if (! is_array($downloads)) {
                $downloads = array();
            }

            if ($zip_url) {
                $download = new WC_Product_Download();
                $download->set_id($download_id);
                $download->set_name('Complete album ZIP');
                $download->set_file($zip_url);
                $downloads[$download_id] = $download;

                if (method_exists($product, 'set_downloadable')) {
                    $product->set_downloadable(true);
                }
            } elseif (isset($downloads[$download_id])) {
                unset($downloads[$download_id]);
            }

            $product->set_downloads($downloads);

            if (method_exists($product, 'save')) {
                $product->save();
            }

            unset($syncing[$product_id]);
        }

        private function lovebox_field_label($key) {
            $key = str_replace(array('-', '_'), ' ', (string) $key);
            $key = preg_replace('/\s+/', ' ', $key);
            return ucwords(trim((string) $key));
        }

        private function lovebox_normalize_form_payload($source) {
            $ignored = array(
                'lovebox_nonce',
                'action',
                'product_id',
                'quantity',
                '_wp_http_referer',
                'http_referer',
                'referer',
                'redirect_to',
                '_wpnonce',
            );
            $payload = array();

            foreach ((array) $source as $key => $raw_value) {
                if (in_array($key, $ignored, true)) {
                    continue;
                }

                $normalized_key = sanitize_key($key);
                if ($normalized_key === '') {
                    continue;
                }

                if (is_array($raw_value)) {
                    $value = implode(
                        ', ',
                        array_filter(
                            array_map(
                                static function($item) {
                                    return sanitize_text_field(wp_unslash((string) $item));
                                },
                                $raw_value
                            )
                        )
                    );
                } else {
                    $value = sanitize_textarea_field(wp_unslash((string) $raw_value));
                }

                if (trim($value) === '') {
                    continue;
                }

                $payload[$normalized_key] = $value;
            }

            return $payload;
        }

        private function lovebox_payload_to_multiline_text($payload) {
            $lines = array();
            foreach ((array) $payload as $key => $value) {
                $lines[] = $this->lovebox_field_label($key) . ': ' . $value;
            }

            return implode(PHP_EOL, $lines);
        }

        private function get_lovebox_occasions($product_id) {
            $occasions = get_post_meta($product_id, '_worldnew_lovebox_occasions', true);
            if (! is_array($occasions)) {
                $occasions = array();
            }

            $occasions = array_values(array_filter(array_map(
                static function($occasion) {
                    return sanitize_text_field((string) $occasion);
                },
                $occasions
            )));

            if (empty($occasions)) {
                $occasions = array('Holiday', 'Say happy birthday', 'Marriage proposal', 'Send a pep talk');
            }

            return $occasions;
        }

        private function is_lovebox_product_compatible($product, $product_id = 0) {
            if (! $product && $product_id > 0 && function_exists('wc_get_product')) {
                $product = wc_get_product($product_id);
            }

            if (! $product || ! method_exists($product, 'get_id')) {
                return false;
            }

            $product_id = $product_id > 0 ? $product_id : (int) $product->get_id();

            return $product_id > 0
                && has_term('lovebox', 'product_cat', $product_id)
                && get_post_meta($product_id, '_worldnew_lovebox_enabled', true) === 'yes';
        }

        private function get_lovebox_product_from_request() {
            if (! function_exists('wc_get_product')) {
                return null;
            }

            $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) wp_unslash($_SERVER['REQUEST_URI']) : '';
            $path = trim((string) wp_parse_url($request_uri, PHP_URL_PATH), '/');

            if (! in_array($path, array('lovebox', 'cameo'), true)) {
                return null;
            }

            $product_param = isset($_GET['product'])
                ? sanitize_text_field(wp_unslash($_GET['product']))
                : '';
            $product_id = 0;

            if ($product_param) {
                if (is_numeric($product_param)) {
                    $product_id = absint($product_param);
                } else {
                    $product_post = get_page_by_path(sanitize_title($product_param), OBJECT, 'product');
                    $product_id = $product_post ? (int) $product_post->ID : 0;
                }
            }

            if ($product_id > 0) {
                $product = wc_get_product($product_id);

                return $this->is_lovebox_product_compatible($product, $product_id) ? $product : null;
            }

            $query = new WP_Query(array(
                'post_type'      => 'product',
                'post_status'    => 'publish',
                'posts_per_page' => 1,
                'tax_query'      => array(
                    array(
                        'taxonomy' => 'product_cat',
                        'field'    => 'slug',
                        'terms'    => array('lovebox'),
                    ),
                ),
                'meta_query'     => array(
                    array(
                        'key'   => '_worldnew_lovebox_enabled',
                        'value' => 'yes',
                    ),
                ),
            ));

            $product = ! empty($query->posts[0]) ? wc_get_product((int) $query->posts[0]->ID) : null;
            wp_reset_postdata();

            return $product;
        }

        private function get_lovebox_media_gallery($product_id, $fallback_image_url = '') {
            $rows = get_post_meta($product_id, '_worldnew_lovebox_media_gallery', true);
            $rows = is_array($rows) ? array_values($rows) : array();
            $gallery = array();

            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $video_id = ! empty($row['video_id']) ? absint($row['video_id']) : 0;
                $poster_id = ! empty($row['poster_id']) ? absint($row['poster_id']) : 0;
                $video_url = ! empty($row['video_url']) ? esc_url_raw((string) $row['video_url']) : '';
                $poster_url = ! empty($row['poster_url']) ? esc_url_raw((string) $row['poster_url']) : '';

                if ($video_id > 0) {
                    $resolved_video_url = wp_get_attachment_url($video_id);
                    if ($resolved_video_url) {
                        $video_url = (string) $resolved_video_url;
                    }
                }

                if ($poster_id > 0) {
                    $resolved_poster_url = wp_get_attachment_image_url($poster_id, 'large');
                    if ($resolved_poster_url) {
                        $poster_url = (string) $resolved_poster_url;
                    }
                }

                if (! $video_url && ! $poster_url) {
                    continue;
                }

                $gallery[] = array(
                    'video_url'  => $video_url,
                    'poster_url' => $poster_url ? $poster_url : $fallback_image_url,
                    'label'      => ! empty($row['video_label']) ? sanitize_text_field((string) $row['video_label']) : '',
                );
            }

            if (empty($gallery) && $fallback_image_url) {
                for ($index = 0; $index < 5; $index++) {
                    $gallery[] = array(
                        'video_url'  => '',
                        'poster_url' => $fallback_image_url,
                        'label'      => '',
                    );
                }
            }

            return array_slice($gallery, 0, 5);
        }

        public function render_lovebox_page() {
            if (is_admin() || wp_doing_ajax()) {
                return;
            }

            $product = $this->get_lovebox_product_from_request();

            if (! $product || ! method_exists($product, 'get_id')) {
                return;
            }

            $product_id = (int) $product->get_id();
            $title = (string) get_post_meta($product_id, '_worldnew_lovebox_heading', true);
            $title = $title ? $title : $product->get_name();
            $profile_name = (string) get_post_meta($product_id, '_worldnew_lovebox_profile_name', true);
            $profile_name = $profile_name ? $profile_name : $product->get_name();
            $profile_role = (string) get_post_meta($product_id, '_worldnew_lovebox_profile_role', true);
            $profile_role = $profile_role ? $profile_role : 'Custom service.';
            $delivery_text = (string) get_post_meta($product_id, '_worldnew_lovebox_delivery_text', true);
            $delivery_text = $delivery_text ? $delivery_text : '24hr delivery';
            $about = (string) get_post_meta($product_id, '_worldnew_lovebox_about', true);
            if (! $about) {
                $about = wp_trim_words(wp_strip_all_tags((string) get_post_field('post_excerpt', $product_id)), 28);
            }

            $profile_image_id = absint(get_post_meta($product_id, '_worldnew_lovebox_profile_image_id', true));
            $profile_image_url = $profile_image_id > 0 ? (string) wp_get_attachment_image_url($profile_image_id, 'thumbnail') : '';
            $product_image_url = '';

            if (method_exists($product, 'get_image_id')) {
                $image_id = (int) $product->get_image_id();
                if ($image_id > 0) {
                    $product_image_url = (string) wp_get_attachment_image_url($image_id, 'large');
                }
            }

            if (! $profile_image_url) {
                $profile_image_url = $product_image_url;
            }

            $gallery = $this->get_lovebox_media_gallery($product_id, $product_image_url);
            $occasions = $this->get_lovebox_occasions($product_id);
            $price_html = $this->get_clean_product_price_html($product);
            $checkout_action = admin_url('admin-post.php');

            status_header(200);
            nocache_headers();
            get_header();
            ?>
            <main class="worldnew-cameo-page">
                <nav class="worldnew-cameo-nav" aria-label="World New shop">
                    <a class="worldnew-cameo-wordmark" href="<?php echo esc_url(home_url('/')); ?>">WORLD<br />NEW.</a>
                    <div class="worldnew-cameo-tabs">
                        <a href="<?php echo esc_url(home_url('/')); ?>">Home</a>
                        <a href="<?php echo esc_url(home_url('/shop/')); ?>">Shop All</a>
                        <a href="<?php echo esc_url(home_url('/product-category/world-new-merch/')); ?>">World New Merch</a>
                        <a href="<?php echo esc_url(home_url('/product-category/franke-merch/')); ?>">Franke Merch</a>
                        <a href="<?php echo esc_url(home_url('/product-category/pool-boyz-merch/')); ?>">Pool Boyz Merch</a>
                    </div>
                    <a class="worldnew-cameo-nav-cta" href="#book-cameo">Book a Cam</a>
                </nav>

                <section class="worldnew-cameo-stage">
                    <aside class="worldnew-cameo-side worldnew-cameo-side--left" aria-hidden="true">
                        <span>&larr;</span>
                        <strong>Personal video<br />edit</strong>
                    </aside>

                    <article class="worldnew-cameo-card" id="book-cameo">
                        <header class="worldnew-cameo-card__header">
                            <h1><?php echo esc_html($title); ?></h1>
                        </header>

                        <div class="worldnew-cameo-card__body">
                            <div class="worldnew-cameo-card__top">
                                <div class="worldnew-cameo-profile">
                                    <?php if ($profile_image_url) : ?>
                                        <img src="<?php echo esc_url($profile_image_url); ?>" alt="<?php echo esc_attr($profile_name); ?>" />
                                    <?php endif; ?>
                                    <div>
                                        <h2><?php echo esc_html($profile_name); ?></h2>
                                        <p><?php echo esc_html($profile_role); ?></p>
                                    </div>
                                </div>
                                <div class="worldnew-cameo-card__arrows" aria-hidden="true">
                                    <span>&larr;</span>
                                    <span>&rarr;</span>
                                </div>
                            </div>

                            <div class="worldnew-cameo-gallery">
                                <?php foreach ($gallery as $media) : ?>
                                    <figure>
                                        <?php if (! empty($media['video_url']) ) : ?>
                                            <video preload="metadata" playsinline poster="<?php echo esc_url($media['poster_url']); ?>">
                                                <source src="<?php echo esc_url($media['video_url']); ?>" />
                                            </video>
                                        <?php elseif (! empty($media['poster_url']) ) : ?>
                                            <img src="<?php echo esc_url($media['poster_url']); ?>" alt="" />
                                        <?php endif; ?>
                                    </figure>
                                <?php endforeach; ?>
                            </div>

                            <div class="worldnew-cameo-stats">
                                <div>
                                    <span class="worldnew-cameo-stat-icon">◇</span>
                                    <p>Price</p>
                                    <strong><?php echo wp_kses_post($price_html ? $price_html : 'Available'); ?></strong>
                                </div>
                                <div>
                                    <span class="worldnew-cameo-stat-icon worldnew-cameo-stat-icon--green">✓</span>
                                    <p>Available for</p>
                                    <strong><?php echo esc_html($delivery_text); ?></strong>
                                </div>
                                <div>
                                    <span class="worldnew-cameo-stat-icon worldnew-cameo-stat-icon--pink">☆</span>
                                    <p>Reviews</p>
                                    <strong>5.0 (23)</strong>
                                </div>
                            </div>

                            <form method="post" action="<?php echo esc_url($checkout_action); ?>" class="worldnew-cameo-booking-form">
                                <?php wp_nonce_field('lovebox_fast_checkout', 'lovebox_nonce'); ?>
                                <input type="hidden" name="action" value="lovebox_fast_checkout" />
                                <input type="hidden" name="product_id" value="<?php echo esc_attr((string) $product_id); ?>" />
                                <input type="hidden" name="quantity" value="1" />
                                <input type="hidden" name="request_type" value="Personal video" />
                                <?php if (! empty($occasions)) : ?>
                                    <label class="worldnew-cameo-occasion">
                                        <span>Occasion</span>
                                        <select name="occasion">
                                            <?php foreach ($occasions as $occasion) : ?>
                                                <option value="<?php echo esc_attr($occasion); ?>"><?php echo esc_html($occasion); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </label>
                                <?php endif; ?>
                                <button type="submit" class="worldnew-cameo-primary">Book a personal video</button>
                            </form>

                            <form method="post" action="<?php echo esc_url($checkout_action); ?>" class="worldnew-cameo-booking-form">
                                <?php wp_nonce_field('lovebox_fast_checkout', 'lovebox_nonce'); ?>
                                <input type="hidden" name="action" value="lovebox_fast_checkout" />
                                <input type="hidden" name="product_id" value="<?php echo esc_attr((string) $product_id); ?>" />
                                <input type="hidden" name="quantity" value="1" />
                                <input type="hidden" name="request_type" value="Business video" />
                                <?php if (! empty($occasions)) : ?>
                                    <label class="worldnew-cameo-occasion">
                                        <span>Occasion</span>
                                        <select name="occasion">
                                            <?php foreach ($occasions as $occasion) : ?>
                                                <option value="<?php echo esc_attr($occasion); ?>"><?php echo esc_html($occasion); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </label>
                                <?php endif; ?>
                                <button type="submit" class="worldnew-cameo-secondary">Book a business video</button>
                            </form>

                            <?php if ($about) : ?>
                                <p class="worldnew-cameo-about"><?php echo esc_html($about); ?></p>
                            <?php endif; ?>

                            <div class="worldnew-cameo-reasons">
                                <h3>Reasons to get a video</h3>
                                <div>
                                    <?php foreach ($occasions as $occasion) : ?>
                                        <span><?php echo esc_html($occasion); ?></span>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </article>

                    <aside class="worldnew-cameo-side worldnew-cameo-side--right" aria-hidden="true">
                        <span>&rarr;</span>
                        <strong>Signature/autograph<br />by franke'</strong>
                    </aside>
                </section>
            </main>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap');
                .worldnew-cameo-page { min-height: 100vh; background: linear-gradient(90deg, #fff1fa 0%, #fff 48%, #fff7fc 100%); color: #07070a; font-family: 'Bricolage Grotesque', 'Trebuchet MS', sans-serif; margin: 0; }
                .worldnew-cameo-page * { box-sizing: border-box; font-family: inherit; }
                .worldnew-cameo-nav { min-height: 78px; display: grid; grid-template-columns: 170px minmax(0, 1fr) 180px; align-items: center; gap: 20px; padding: 12px clamp(18px, 5vw, 88px); background: #F839A9; color: #fff; }
                .worldnew-cameo-wordmark { color: #fff !important; text-decoration: none !important; font-size: 1.5rem; font-style: italic; font-weight: 800; line-height: .76; letter-spacing: -.06em; transform: rotate(-7deg); display: inline-block; }
                .worldnew-cameo-tabs { display: flex; align-items: center; justify-content: center; gap: clamp(16px, 2.3vw, 34px); text-align: center; }
                .worldnew-cameo-tabs a { color: #fff !important; text-decoration: none !important; font-size: .98rem; font-weight: 700; white-space: nowrap; }
                .worldnew-cameo-nav-cta { justify-self: end; color: #F839A9 !important; background: #050505; border: 1px solid rgba(255,255,255,.42); border-radius: 14px; padding: 14px 24px; text-decoration: none !important; font-weight: 800; box-shadow: 0 0 0 2px rgba(255,255,255,.14), 0 10px 22px rgba(0,0,0,.18); }
                .worldnew-cameo-stage { max-width: 1600px; margin: 0 auto; padding: 22px clamp(18px, 4vw, 64px) 0; display: grid; grid-template-columns: 180px minmax(0, 1040px) 210px; gap: 26px; align-items: center; }
                .worldnew-cameo-side { display: grid; justify-items: center; gap: 18px; font-weight: 800; text-align: center; }
                .worldnew-cameo-side span { width: 68px; height: 68px; border-radius: 999px; display: grid; place-items: center; background: rgba(255,255,255,.72); box-shadow: 0 12px 28px rgba(248,57,169,.16); font-size: 2rem; }
                .worldnew-cameo-side--right span { box-shadow: 0 12px 28px rgba(248, 57, 169, .18); }
                .worldnew-cameo-card { overflow: hidden; border-radius: 52px 52px 0 0; background: rgba(255,255,255,.82); box-shadow: 0 28px 70px -48px rgba(248,57,169,.9); border: 1px solid rgba(248,57,169,.14); }
                .worldnew-cameo-card__header { padding: 26px 24px; text-align: center; background: linear-gradient(180deg, #ffe4f4, #fff3fa); }
                .worldnew-cameo-card__header h1 { margin: 0; font-size: 1.35rem; line-height: 1.1; font-weight: 800; color: #050505; }
                .worldnew-cameo-card__body { padding: 28px 32px 30px; }
                .worldnew-cameo-card__top { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
                .worldnew-cameo-profile { display: flex; align-items: center; gap: 18px; min-width: 0; }
                .worldnew-cameo-profile img { width: 76px; height: 76px; border-radius: 999px; object-fit: cover; border: 3px solid #fff; box-shadow: 0 0 22px rgba(248, 57, 169, .35); }
                .worldnew-cameo-profile h2 { margin: 0; font-size: 1.25rem; line-height: 1.1; }
                .worldnew-cameo-profile p { margin: 7px 0 0; color: #4b5563; font-size: .95rem; }
                .worldnew-cameo-card__arrows { display: flex; gap: 14px; }
                .worldnew-cameo-card__arrows span { width: 62px; height: 62px; border-radius: 13px; display: grid; place-items: center; background: #050505; color: #F839A9; font-size: 2rem; font-weight: 800; }
                .worldnew-cameo-gallery { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-bottom: 28px; }
                .worldnew-cameo-gallery figure { margin: 0; overflow: hidden; border-radius: 14px; background: #ffe4f4; aspect-ratio: 4 / 5.5; }
                .worldnew-cameo-gallery img,
                .worldnew-cameo-gallery video { width: 100%; height: 100%; object-fit: cover; display: block; }
                .worldnew-cameo-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin-bottom: 24px; }
                .worldnew-cameo-stats div { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center; }
                .worldnew-cameo-stat-icon { grid-row: span 2; width: 30px; height: 30px; border-radius: 999px; display: grid; place-items: center; color: #F839A9; border: 1px solid currentColor; }
                .worldnew-cameo-stat-icon--green { color: #22c55e; }
                .worldnew-cameo-stat-icon--pink { color: #F839A9; }
                .worldnew-cameo-stats p { margin: 0 0 4px; color: #111827; }
                .worldnew-cameo-stats strong { color: #111827; font-size: 1.05rem; }
                .worldnew-cameo-stats .amount { font-weight: 800; }
                .worldnew-cameo-stats del { color: #6b7280; font-weight: 600; text-decoration-thickness: 2px; }
                .worldnew-cameo-stats ins { color: #111827; font-weight: 800; text-decoration: none; }
                .worldnew-cameo-booking-form { margin: 0 0 14px; }
                .worldnew-cameo-primary,
                .worldnew-cameo-secondary { width: 100%; border: 0; border-radius: 999px; min-height: 54px; padding: 14px 22px; cursor: pointer; font-size: 1.05rem; font-weight: 800; }
                .worldnew-cameo-primary { background: #F839A9; color: #fff; box-shadow: 0 18px 34px -22px rgba(248, 57, 169, .95); }
                .worldnew-cameo-secondary { background: #050505; color: #F839A9; box-shadow: 0 14px 28px -22px rgba(248, 57, 169, .95); }
                .worldnew-cameo-about { margin: 18px 6px 0; color: #374151; line-height: 1.55; }
                .worldnew-cameo-reasons { margin-top: 22px; }
                .worldnew-cameo-reasons h3 { margin: 0 0 16px; font-size: 1.05rem; text-transform: uppercase; letter-spacing: .02em; }
                .worldnew-cameo-reasons div { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
                .worldnew-cameo-reasons span { border: 1px solid rgba(248,57,169,.45); border-radius: 999px; min-height: 42px; padding: 10px 26px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,.8); font-weight: 700; }
                @media (max-width: 1120px) {
                    .worldnew-cameo-nav { grid-template-columns: 120px 1fr; }
                    .worldnew-cameo-nav-cta { grid-column: 1 / -1; justify-self: center; }
                    .worldnew-cameo-stage { grid-template-columns: 1fr; }
                    .worldnew-cameo-side { display: none; }
                }
                @media (max-width: 760px) {
                    .worldnew-cameo-nav { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
                    .worldnew-cameo-tabs { flex-wrap: wrap; gap: 12px 18px; }
                    .worldnew-cameo-stage { padding: 18px 12px 0; }
                    .worldnew-cameo-card { border-radius: 30px 30px 0 0; }
                    .worldnew-cameo-card__body { padding: 20px 16px 24px; }
                    .worldnew-cameo-card__top { align-items: flex-start; }
                    .worldnew-cameo-card__arrows span { width: 44px; height: 44px; font-size: 1.45rem; }
                    .worldnew-cameo-gallery { grid-template-columns: repeat(2, 1fr); }
                    .worldnew-cameo-gallery figure:nth-child(n+5) { display: none; }
                    .worldnew-cameo-stats { grid-template-columns: 1fr; gap: 14px; }
                }
            </style>
            <?php
            get_footer();
            exit;
        }

        public function enqueue_lovebox_product_admin_assets($hook) {
            if (! in_array($hook, array('post.php', 'post-new.php'), true)) {
                return;
            }

            $screen = function_exists('get_current_screen') ? get_current_screen() : null;
            if (! $screen || $screen->post_type !== 'product') {
                return;
            }

            wp_enqueue_media();
        }

        public function register_lovebox_product_metabox() {
            if (! post_type_exists('product')) {
                return;
            }

            add_meta_box(
                'worldnew_lovebox_product_meta',
                'World New Custom Service',
                array($this, 'render_lovebox_product_metabox'),
                'product',
                'normal',
                'default'
            );
        }

        public function render_lovebox_product_metabox($post) {
            wp_nonce_field('worldnew_lovebox_product_meta', 'worldnew_lovebox_product_meta_nonce');

            $enabled = get_post_meta($post->ID, '_worldnew_lovebox_enabled', true) === 'yes';
            $heading = (string) get_post_meta($post->ID, '_worldnew_lovebox_heading', true);
            $delivery_text = (string) get_post_meta($post->ID, '_worldnew_lovebox_delivery_text', true);
            $about = (string) get_post_meta($post->ID, '_worldnew_lovebox_about', true);
            $profile_name = (string) get_post_meta($post->ID, '_worldnew_lovebox_profile_name', true);
            $profile_role = (string) get_post_meta($post->ID, '_worldnew_lovebox_profile_role', true);
            $profile_image_id = absint(get_post_meta($post->ID, '_worldnew_lovebox_profile_image_id', true));
            $profile_image_url = $profile_image_id > 0 ? (string) wp_get_attachment_image_url($profile_image_id, 'thumbnail') : '';
            $media_rows = get_post_meta($post->ID, '_worldnew_lovebox_media_gallery', true);
            $media_rows = is_array($media_rows) ? array_values($media_rows) : array();
            $occasions = $this->get_lovebox_occasions($post->ID);
            ?>
            <style>
                .worldnew-lovebox-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .worldnew-lovebox-grid--single { grid-template-columns: minmax(0, 1fr); }
                .worldnew-lovebox-field label { display: block; font-weight: 600; margin-bottom: 6px; }
                .worldnew-lovebox-field input[type="text"],
                .worldnew-lovebox-field textarea { width: 100%; }
                .worldnew-lovebox-media-row { border: 1px solid #dcdcde; border-radius: 12px; padding: 14px; margin-top: 12px; background: #fff; }
                .worldnew-lovebox-media-row__top { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
                .worldnew-lovebox-media-row__preview { margin-top: 8px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
                .worldnew-lovebox-media-row__poster img { max-width: 120px; border-radius: 10px; display: block; }
                .worldnew-lovebox-actions { margin-top: 14px; }
                .worldnew-lovebox-service-url { margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: #f6f7f7; }
            </style>

            <p>
                <label>
                    <input type="checkbox" name="worldnew_lovebox_enabled" value="yes" <?php checked($enabled); ?> />
                    Use the reusable Cameo-style custom service layout for this product.
                </label>
            </p>

            <div class="worldnew-lovebox-grid">
                <div class="worldnew-lovebox-field">
                    <label for="worldnew_lovebox_heading">Headline</label>
                    <input type="text" id="worldnew_lovebox_heading" name="worldnew_lovebox_heading" value="<?php echo esc_attr($heading); ?>" placeholder="Defaults to product title" />
                </div>
                <div class="worldnew-lovebox-field">
                    <label for="worldnew_lovebox_delivery_text">Delivery text</label>
                    <input type="text" id="worldnew_lovebox_delivery_text" name="worldnew_lovebox_delivery_text" value="<?php echo esc_attr($delivery_text); ?>" placeholder="24hr delivery" />
                </div>
                <div class="worldnew-lovebox-field">
                    <label for="worldnew_lovebox_profile_name">Profile name</label>
                    <input type="text" id="worldnew_lovebox_profile_name" name="worldnew_lovebox_profile_name" value="<?php echo esc_attr($profile_name); ?>" placeholder="Defaults to product title" />
                </div>
                <div class="worldnew-lovebox-field">
                    <label for="worldnew_lovebox_profile_role">Profile role</label>
                    <input type="text" id="worldnew_lovebox_profile_role" name="worldnew_lovebox_profile_role" value="<?php echo esc_attr($profile_role); ?>" placeholder="Custom service." />
                </div>
            </div>

            <div class="worldnew-lovebox-grid worldnew-lovebox-grid--single" style="margin-top:12px;">
                <div class="worldnew-lovebox-field">
                    <label>Profile image</label>
                    <input type="hidden" id="worldnew_lovebox_profile_image_id" name="worldnew_lovebox_profile_image_id" value="<?php echo esc_attr((string) $profile_image_id); ?>" />
                    <div class="worldnew-lovebox-media-row__preview">
                        <button type="button" class="button" id="worldnewSelectProfileImage">Select image</button>
                        <button type="button" class="button-link-delete" id="worldnewClearProfileImage">Clear</button>
                        <div class="worldnew-lovebox-media-row__poster">
                            <img id="worldnewProfileImagePreview" src="<?php echo esc_url($profile_image_url); ?>" alt="" style="<?php echo $profile_image_url ? '' : 'display:none;'; ?>" />
                        </div>
                    </div>
                </div>
                <div class="worldnew-lovebox-field">
                    <label for="worldnew_lovebox_about">About copy</label>
                    <textarea id="worldnew_lovebox_about" name="worldnew_lovebox_about" rows="5" placeholder="Defaults to the product short description, then the full product description."><?php echo esc_textarea($about); ?></textarea>
                </div>
                <div class="worldnew-lovebox-field">
                    <label for="worldnew_lovebox_occasions">Occasions</label>
                    <textarea id="worldnew_lovebox_occasions" name="worldnew_lovebox_occasions" rows="5" placeholder="One occasion per line"><?php echo esc_textarea(implode(PHP_EOL, $occasions)); ?></textarea>
                    <p class="description" style="margin:6px 0 0;">One occasion per line. Only the occasions entered here will appear on the Lovebox page and in checkout submissions.</p>
                </div>
            </div>

            <div class="worldnew-lovebox-service-url">
                <strong>Service URL:</strong>
                <code><?php echo esc_html(home_url('/lovebox/?product=' . $post->post_name)); ?></code>
                <p style="margin:6px 0 0;">When this product is also in the <code>lovebox</code> category, its normal WooCommerce product page will redirect here.</p>
            </div>

            <h3 style="margin-top:18px;">Service videos</h3>
            <p>Add as many videos as you want. Each video can have its own poster image.</p>

            <div id="worldnewCameoMediaRows">
                <?php foreach ($media_rows as $index => $row) : ?>
                    <?php
                    $video_id = ! empty($row['video_id']) ? absint($row['video_id']) : 0;
                    $poster_id = ! empty($row['poster_id']) ? absint($row['poster_id']) : 0;
                    $video_url = ! empty($row['video_url']) ? esc_url_raw((string) $row['video_url']) : '';
                    $poster_url = ! empty($row['poster_url']) ? esc_url_raw((string) $row['poster_url']) : '';
                    $video_label = ! empty($row['video_label']) ? sanitize_text_field((string) $row['video_label']) : '';

                    if ($video_id > 0) {
                        $resolved_video_url = wp_get_attachment_url($video_id);
                        if ($resolved_video_url) {
                            $video_url = $resolved_video_url;
                        }
                    }

                    if ($poster_id > 0) {
                        $resolved_poster_url = wp_get_attachment_image_url($poster_id, 'thumbnail');
                        if ($resolved_poster_url) {
                            $poster_url = $resolved_poster_url;
                        }
                    }
                    ?>
                    <div class="worldnew-lovebox-media-row" data-index="<?php echo esc_attr((string) $index); ?>">
                        <div class="worldnew-lovebox-media-row__top">
                            <strong>Video <?php echo esc_html((string) ($index + 1)); ?></strong>
                            <button type="button" class="button-link-delete worldnew-remove-lovebox-row">Remove</button>
                        </div>
                        <input type="hidden" name="worldnew_lovebox_media[<?php echo esc_attr((string) $index); ?>][video_id]" value="<?php echo esc_attr((string) $video_id); ?>" class="worldnew-lovebox-video-id" />
                        <input type="hidden" name="worldnew_lovebox_media[<?php echo esc_attr((string) $index); ?>][video_url]" value="<?php echo esc_attr($video_url); ?>" class="worldnew-lovebox-video-url" />
                        <input type="hidden" name="worldnew_lovebox_media[<?php echo esc_attr((string) $index); ?>][poster_id]" value="<?php echo esc_attr((string) $poster_id); ?>" class="worldnew-lovebox-poster-id" />
                        <input type="hidden" name="worldnew_lovebox_media[<?php echo esc_attr((string) $index); ?>][poster_url]" value="<?php echo esc_attr($poster_url); ?>" class="worldnew-lovebox-poster-url" />
                        <div class="worldnew-lovebox-grid" style="margin-top:12px;">
                            <div class="worldnew-lovebox-field">
                                <label>Video file</label>
                                <button type="button" class="button worldnew-select-lovebox-video">Select video</button>
                                <div class="worldnew-lovebox-media-row__preview">
                                    <a href="<?php echo esc_url($video_url); ?>" target="_blank" class="worldnew-lovebox-video-link" style="<?php echo $video_url ? '' : 'display:none;'; ?>"><?php echo esc_html($video_label !== '' ? $video_label : basename((string) wp_parse_url($video_url, PHP_URL_PATH))); ?></a>
                                    <button type="button" class="button-link-delete worldnew-clear-lovebox-video" style="<?php echo $video_url ? '' : 'display:none;'; ?>">Clear video</button>
                                </div>
                                <input type="text" name="worldnew_lovebox_media[<?php echo esc_attr((string) $index); ?>][video_label]" value="<?php echo esc_attr($video_label); ?>" class="regular-text" placeholder="Optional label" style="margin-top:8px;" />
                            </div>
                            <div class="worldnew-lovebox-field">
                                <label>Poster image</label>
                                <button type="button" class="button worldnew-select-lovebox-poster">Select poster</button>
                                <div class="worldnew-lovebox-media-row__preview">
                                    <div class="worldnew-lovebox-media-row__poster">
                                        <img src="<?php echo esc_url($poster_url); ?>" alt="" class="worldnew-lovebox-poster-preview" style="<?php echo $poster_url ? '' : 'display:none;'; ?>" />
                                    </div>
                                    <button type="button" class="button-link-delete worldnew-clear-lovebox-poster" style="<?php echo $poster_url ? '' : 'display:none;'; ?>">Clear poster</button>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="worldnew-lovebox-actions">
                <button type="button" class="button button-secondary" id="worldnewAddCameoMediaRow">Add video</button>
            </div>

            <script type="text/template" id="worldnew-lovebox-media-row-template">
                <div class="worldnew-lovebox-media-row" data-index="__INDEX__">
                    <div class="worldnew-lovebox-media-row__top">
                        <strong>Video __NUMBER__</strong>
                        <button type="button" class="button-link-delete worldnew-remove-lovebox-row">Remove</button>
                    </div>
                    <input type="hidden" name="worldnew_lovebox_media[__INDEX__][video_id]" value="" class="worldnew-lovebox-video-id" />
                    <input type="hidden" name="worldnew_lovebox_media[__INDEX__][video_url]" value="" class="worldnew-lovebox-video-url" />
                    <input type="hidden" name="worldnew_lovebox_media[__INDEX__][poster_id]" value="" class="worldnew-lovebox-poster-id" />
                    <input type="hidden" name="worldnew_lovebox_media[__INDEX__][poster_url]" value="" class="worldnew-lovebox-poster-url" />
                    <div class="worldnew-lovebox-grid" style="margin-top:12px;">
                        <div class="worldnew-lovebox-field">
                            <label>Video file</label>
                            <button type="button" class="button worldnew-select-lovebox-video">Select video</button>
                            <div class="worldnew-lovebox-media-row__preview">
                                <a href="" target="_blank" class="worldnew-lovebox-video-link" style="display:none;"></a>
                                <button type="button" class="button-link-delete worldnew-clear-lovebox-video" style="display:none;">Clear video</button>
                            </div>
                            <input type="text" name="worldnew_lovebox_media[__INDEX__][video_label]" value="" class="regular-text" placeholder="Optional label" style="margin-top:8px;" />
                        </div>
                        <div class="worldnew-lovebox-field">
                            <label>Poster image</label>
                            <button type="button" class="button worldnew-select-lovebox-poster">Select poster</button>
                            <div class="worldnew-lovebox-media-row__preview">
                                <div class="worldnew-lovebox-media-row__poster">
                                    <img src="" alt="" class="worldnew-lovebox-poster-preview" style="display:none;" />
                                </div>
                                <button type="button" class="button-link-delete worldnew-clear-lovebox-poster" style="display:none;">Clear poster</button>
                            </div>
                        </div>
                    </div>
                </div>
            </script>

            <script>
                (function() {
                    if (typeof wp === 'undefined' || !wp.media) {
                        return;
                    }

                    const rowsContainer = document.getElementById('worldnewCameoMediaRows');
                    const addRowButton = document.getElementById('worldnewAddCameoMediaRow');
                    const rowTemplate = document.getElementById('worldnew-lovebox-media-row-template').innerHTML;
                    let nextRowIndex = Array.from(rowsContainer.querySelectorAll('.worldnew-lovebox-media-row')).reduce((highest, row) => {
                        const rowIndex = Number(row.getAttribute('data-index') || 0);
                        return Math.max(highest, rowIndex);
                    }, -1) + 1;
                    const profileImageIdInput = document.getElementById('worldnew_lovebox_profile_image_id');
                    const profileImagePreview = document.getElementById('worldnewProfileImagePreview');
                    const selectProfileImageButton = document.getElementById('worldnewSelectProfileImage');
                    const clearProfileImageButton = document.getElementById('worldnewClearProfileImage');

                    function updateRowTitles() {
                        rowsContainer.querySelectorAll('.worldnew-lovebox-media-row').forEach((row, index) => {
                            const title = row.querySelector('.worldnew-lovebox-media-row__top strong');
                            if (title) {
                                title.textContent = `Video ${index + 1}`;
                            }
                        });
                    }

                    function createMediaFrame(options, onSelect) {
                        const frame = wp.media({
                            title: options.title,
                            library: options.library,
                            button: { text: options.buttonText },
                            multiple: false
                        });

                        frame.on('select', () => {
                            const attachment = frame.state().get('selection').first().toJSON();
                            onSelect(attachment);
                        });

                        frame.open();
                    }

                    function updateVideoPreview(row, attachment) {
                        row.querySelector('.worldnew-lovebox-video-id').value = attachment.id || '';
                        row.querySelector('.worldnew-lovebox-video-url').value = attachment.url || '';

                        const link = row.querySelector('.worldnew-lovebox-video-link');
                        const clearButton = row.querySelector('.worldnew-clear-lovebox-video');
                        link.href = attachment.url || '';
                        link.textContent = attachment.filename || attachment.title || 'Selected video';
                        link.style.display = attachment.url ? '' : 'none';
                        clearButton.style.display = attachment.url ? '' : 'none';
                    }

                    function clearVideoPreview(row) {
                        row.querySelector('.worldnew-lovebox-video-id').value = '';
                        row.querySelector('.worldnew-lovebox-video-url').value = '';

                        const link = row.querySelector('.worldnew-lovebox-video-link');
                        const clearButton = row.querySelector('.worldnew-clear-lovebox-video');
                        link.href = '';
                        link.textContent = '';
                        link.style.display = 'none';
                        clearButton.style.display = 'none';
                    }

                    function updatePosterPreview(row, attachment) {
                        row.querySelector('.worldnew-lovebox-poster-id').value = attachment.id || '';
                        row.querySelector('.worldnew-lovebox-poster-url').value = attachment.url || '';

                        const preview = row.querySelector('.worldnew-lovebox-poster-preview');
                        const clearButton = row.querySelector('.worldnew-clear-lovebox-poster');
                        preview.src = attachment.url || '';
                        preview.style.display = attachment.url ? '' : 'none';
                        clearButton.style.display = attachment.url ? '' : 'none';
                    }

                    function clearPosterPreview(row) {
                        row.querySelector('.worldnew-lovebox-poster-id').value = '';
                        row.querySelector('.worldnew-lovebox-poster-url').value = '';

                        const preview = row.querySelector('.worldnew-lovebox-poster-preview');
                        const clearButton = row.querySelector('.worldnew-clear-lovebox-poster');
                        preview.src = '';
                        preview.style.display = 'none';
                        clearButton.style.display = 'none';
                    }

                    function attachRowEvents(row) {
                        row.querySelector('.worldnew-select-lovebox-video').addEventListener('click', () => {
                            createMediaFrame(
                                {
                                    title: 'Select service video',
                                    buttonText: 'Use video',
                                    library: { type: 'video' }
                                },
                                (attachment) => updateVideoPreview(row, attachment)
                            );
                        });

                        row.querySelector('.worldnew-select-lovebox-poster').addEventListener('click', () => {
                            createMediaFrame(
                                {
                                    title: 'Select poster image',
                                    buttonText: 'Use poster',
                                    library: { type: 'image' }
                                },
                                (attachment) => updatePosterPreview(row, attachment)
                            );
                        });

                        row.querySelector('.worldnew-clear-lovebox-video').addEventListener('click', () => {
                            clearVideoPreview(row);
                        });

                        row.querySelector('.worldnew-clear-lovebox-poster').addEventListener('click', () => {
                            clearPosterPreview(row);
                        });

                        row.querySelector('.worldnew-remove-lovebox-row').addEventListener('click', () => {
                            row.remove();
                            updateRowTitles();
                        });
                    }

                    function addRow() {
                        const index = nextRowIndex;
                        nextRowIndex += 1;
                        const rowHtml = rowTemplate
                            .replaceAll('__INDEX__', String(index))
                            .replaceAll('__NUMBER__', String(index + 1));

                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = rowHtml.trim();
                        const row = wrapper.firstElementChild;
                        rowsContainer.appendChild(row);
                        attachRowEvents(row);
                        updateRowTitles();
                    }

                    rowsContainer.querySelectorAll('.worldnew-lovebox-media-row').forEach((row) => {
                        attachRowEvents(row);
                    });

                    addRowButton.addEventListener('click', addRow);

                    selectProfileImageButton.addEventListener('click', () => {
                        createMediaFrame(
                            {
                                title: 'Select profile image',
                                buttonText: 'Use image',
                                library: { type: 'image' }
                            },
                            (attachment) => {
                                profileImageIdInput.value = attachment.id || '';
                                profileImagePreview.src = attachment.url || '';
                                profileImagePreview.style.display = attachment.url ? '' : 'none';
                            }
                        );
                    });

                    clearProfileImageButton.addEventListener('click', () => {
                        profileImageIdInput.value = '';
                        profileImagePreview.src = '';
                        profileImagePreview.style.display = 'none';
                    });

                    updateRowTitles();
                })();
            </script>
            <?php
        }

        public function save_lovebox_product_meta($post_id, $post, $update) {
            if (! isset($_POST['worldnew_lovebox_product_meta_nonce'])) {
                return;
            }

            if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['worldnew_lovebox_product_meta_nonce'])), 'worldnew_lovebox_product_meta')) {
                return;
            }

            if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
                return;
            }

            if (! current_user_can('edit_post', $post_id)) {
                return;
            }

            update_post_meta($post_id, '_worldnew_lovebox_enabled', isset($_POST['worldnew_lovebox_enabled']) ? 'yes' : 'no');
            update_post_meta($post_id, '_worldnew_lovebox_heading', isset($_POST['worldnew_lovebox_heading']) ? sanitize_text_field(wp_unslash($_POST['worldnew_lovebox_heading'])) : '');
            update_post_meta($post_id, '_worldnew_lovebox_delivery_text', isset($_POST['worldnew_lovebox_delivery_text']) ? sanitize_text_field(wp_unslash($_POST['worldnew_lovebox_delivery_text'])) : '');
            update_post_meta($post_id, '_worldnew_lovebox_about', isset($_POST['worldnew_lovebox_about']) ? wp_kses_post(wp_unslash($_POST['worldnew_lovebox_about'])) : '');
            update_post_meta($post_id, '_worldnew_lovebox_profile_name', isset($_POST['worldnew_lovebox_profile_name']) ? sanitize_text_field(wp_unslash($_POST['worldnew_lovebox_profile_name'])) : '');
            update_post_meta($post_id, '_worldnew_lovebox_profile_role', isset($_POST['worldnew_lovebox_profile_role']) ? sanitize_text_field(wp_unslash($_POST['worldnew_lovebox_profile_role'])) : '');
            update_post_meta($post_id, '_worldnew_lovebox_profile_image_id', isset($_POST['worldnew_lovebox_profile_image_id']) ? absint(wp_unslash($_POST['worldnew_lovebox_profile_image_id'])) : 0);
            $raw_occasions = isset($_POST['worldnew_lovebox_occasions']) ? (string) wp_unslash($_POST['worldnew_lovebox_occasions']) : '';
            $occasions = array_values(array_filter(array_map(
                static function($line) {
                    return sanitize_text_field(trim((string) $line));
                },
                preg_split('/\r\n|\r|\n/', $raw_occasions)
            )));
            if (! empty($occasions)) {
                update_post_meta($post_id, '_worldnew_lovebox_occasions', $occasions);
            } else {
                delete_post_meta($post_id, '_worldnew_lovebox_occasions');
            }

            $raw_rows = isset($_POST['worldnew_lovebox_media']) && is_array($_POST['worldnew_lovebox_media'])
                ? wp_unslash($_POST['worldnew_lovebox_media'])
                : array();
            $sanitized_rows = array();

            foreach ($raw_rows as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $video_id = ! empty($row['video_id']) ? absint($row['video_id']) : 0;
                $poster_id = ! empty($row['poster_id']) ? absint($row['poster_id']) : 0;
                $video_url = ! empty($row['video_url']) ? esc_url_raw((string) $row['video_url']) : '';
                $poster_url = ! empty($row['poster_url']) ? esc_url_raw((string) $row['poster_url']) : '';
                $video_label = ! empty($row['video_label']) ? sanitize_text_field((string) $row['video_label']) : '';

                if ($video_id > 0 && $video_url === '') {
                    $video_url = (string) wp_get_attachment_url($video_id);
                }

                if ($poster_id > 0 && $poster_url === '') {
                    $poster_url = (string) wp_get_attachment_image_url($poster_id, 'large');
                }

                if ($video_id <= 0 && $video_url === '') {
                    continue;
                }

                $sanitized_rows[] = array(
                    'video_id' => $video_id,
                    'video_url' => $video_url,
                    'video_label' => $video_label,
                    'poster_id' => $poster_id,
                    'poster_url' => $poster_url,
                );
            }

            if (! empty($sanitized_rows)) {
                update_post_meta($post_id, '_worldnew_lovebox_media_gallery', $sanitized_rows);
            } else {
                delete_post_meta($post_id, '_worldnew_lovebox_media_gallery');
            }
        }

        public function redirect_lovebox_products_to_custom_layout() {
            if (is_admin() || wp_doing_ajax()) {
                return;
            }

            if (! function_exists('is_product') || ! is_product()) {
                return;
            }

            $product_id = get_queried_object_id();
            $product = function_exists('wc_get_product') ? wc_get_product($product_id) : null;

            if (! $this->is_lovebox_product_compatible($product, $product_id)) {
                return;
            }

            $target_url = add_query_arg(
                array('product' => $product->get_slug()),
                home_url('/lovebox/')
            );

            wp_safe_redirect($target_url, 302);
            exit;
        }

        private function is_album_product_compatible($product, $product_id = 0) {
            if (! $product_id && is_object($product) && method_exists($product, 'get_id')) {
                $product_id = (int) $product->get_id();
            }

            return $product_id > 0 && has_term('album', 'product_cat', $product_id);
        }

        private function assign_album_product_category($product_id, $is_album) {
            if (! taxonomy_exists('product_cat') || $product_id < 1) {
                return;
            }

            $term = get_term_by('slug', 'album', 'product_cat');
            if (! $term) {
                $created = wp_insert_term('Album', 'product_cat', array('slug' => 'album'));
                if (! is_wp_error($created) && ! empty($created['term_id'])) {
                    $term = get_term((int) $created['term_id'], 'product_cat');
                }
            }

            if (! $term || is_wp_error($term)) {
                return;
            }

            if ($is_album) {
                wp_set_object_terms($product_id, array((int) $term->term_id), 'product_cat', true);
                return;
            }

            wp_remove_object_terms($product_id, array((int) $term->term_id), 'product_cat');
        }

        private function get_album_child_product_ids($product) {
            $ids = array();

            if (! is_object($product)) {
                return $ids;
            }

            $bundle_id = method_exists($product, 'get_id') ? (int) $product->get_id() : 0;

            $add_bundle_item_ids = function ($items) use (&$ids) {
                if (! is_array($items)) {
                    return;
                }

                foreach ($items as $item) {
                    if (is_array($item)) {
                        $product_id = ! empty($item['id']) ? absint($item['id']) : 0;
                        if (! $product_id && ! empty($item['product_id'])) {
                            $product_id = absint($item['product_id']);
                        }
                        if ($product_id > 0) {
                            $ids[] = $product_id;
                        }
                    } elseif (is_numeric($item)) {
                        $product_id = absint($item);
                        if ($product_id > 0) {
                            $ids[] = $product_id;
                        }
                    }
                }
            };

            if ($bundle_id > 0 && class_exists('WC_PB_DB') && method_exists('WC_PB_DB', 'query_bundled_items')) {
                $pb_ids = WC_PB_DB::query_bundled_items(array(
                    'return'    => 'id=>product_id',
                    'bundle_id' => array($bundle_id),
                ));

                if (is_array($pb_ids)) {
                    foreach ($pb_ids as $product_id) {
                        $product_id = absint($product_id);
                        if ($product_id > 0) {
                            $ids[] = $product_id;
                        }
                    }
                }
            }

            if (method_exists($product, 'get_bundled_item_ids')) {
                $bundled_item_ids = $product->get_bundled_item_ids();
                if (is_array($bundled_item_ids) && class_exists('WC_PB_DB') && method_exists('WC_PB_DB', 'query_bundled_items')) {
                    $pb_ids = WC_PB_DB::query_bundled_items(array(
                        'return'          => 'id=>product_id',
                        'bundled_item_id' => array_map('absint', $bundled_item_ids),
                    ));

                    if (is_array($pb_ids)) {
                        foreach ($pb_ids as $product_id) {
                            $product_id = absint($product_id);
                            if ($product_id > 0) {
                                $ids[] = $product_id;
                            }
                        }
                    }
                }
            }

            if (method_exists($product, 'get_ids')) {
                $add_bundle_item_ids($product->get_ids());
            }

            if (method_exists($product, 'build_items')) {
                $product->build_items();
            }

            if (method_exists($product, 'get_items')) {
                $add_bundle_item_ids($product->get_items());
            }

            if ($bundle_id > 0) {
                $woosb_ids = get_post_meta($bundle_id, 'woosb_ids', true);
                if (is_array($woosb_ids)) {
                    $add_bundle_item_ids($woosb_ids);
                } elseif (is_string($woosb_ids) && '' !== trim($woosb_ids)) {
                    foreach (array_filter(explode(',', $woosb_ids)) as $ids_item) {
                        $parts = explode('/', $ids_item);
                        $raw_id = isset($parts[0]) ? rawurldecode((string) $parts[0]) : '';
                        $product_id = is_numeric($raw_id) ? absint($raw_id) : 0;

                        if (! $product_id && function_exists('wc_get_product_id_by_sku') && $raw_id) {
                            $product_id = absint(wc_get_product_id_by_sku(ltrim($raw_id, 'sku-')));
                        }

                        if ($product_id > 0) {
                            $ids[] = $product_id;
                        }
                    }
                }
            }

            if (method_exists($product, 'get_children')) {
                $children = $product->get_children();
                if (is_array($children)) {
                    foreach ($children as $child_id) {
                        $child_id = absint($child_id);
                        if ($child_id > 0) {
                            $ids[] = $child_id;
                        }
                    }
                }
            }

            if (method_exists($product, 'get_bundled_data_items')) {
                $bundled_data_items = $product->get_bundled_data_items();
                if (is_array($bundled_data_items)) {
                    foreach ($bundled_data_items as $bundled_data_item) {
                        if (is_object($bundled_data_item) && method_exists($bundled_data_item, 'get_product_id')) {
                            $product_id = absint($bundled_data_item->get_product_id());
                            if ($product_id > 0) {
                                $ids[] = $product_id;
                            }
                        }
                    }
                }
            }

            if (method_exists($product, 'get_bundled_items')) {
                $bundled_items = $product->get_bundled_items();
                if (is_array($bundled_items)) {
                    foreach ($bundled_items as $bundled_item) {
                        $bundled_product = is_object($bundled_item) && method_exists($bundled_item, 'get_product')
                            ? $bundled_item->get_product()
                            : null;
                        $bundled_id = $bundled_product && method_exists($bundled_product, 'get_id')
                            ? (int) $bundled_product->get_id()
                            : 0;

                        if (! $bundled_id && is_object($bundled_item) && method_exists($bundled_item, 'get_product_id')) {
                            $bundled_id = (int) $bundled_item->get_product_id();
                        }

                        if ($bundled_id > 0) {
                            $ids[] = $bundled_id;
                        }
                    }
                }
            }

            return array_values(array_unique($ids));
        }

        private function get_album_track_rows($product, $product_id) {
            $rows = array();
            $album_artist = (string) get_post_meta($product_id, '_worldnew_music_artist', true);
            $configured_tracks = $this->get_album_package_tracks($product_id);

            foreach ($configured_tracks as $track) {
                $stream_url = ! empty($track['web_file_url']) ? (string) $track['web_file_url'] : '';

                if (! $stream_url && ! empty($track['itunes_file_url'])) {
                    $stream_url = (string) $track['itunes_file_url'];
                }

                if (! $stream_url) {
                    continue;
                }

                $preview_seconds = ! empty($track['preview_seconds']) ? (int) $track['preview_seconds'] : 30;
                $preview_start_seconds = ! empty($track['preview_start_seconds']) ? (int) $track['preview_start_seconds'] : 0;
                $preview_end_seconds = ! empty($track['preview_end_seconds']) ? (int) $track['preview_end_seconds'] : 0;
                $duration = ! empty($track['duration']) ? (string) $track['duration'] : gmdate('i:s', max(5, $preview_seconds));

                $rows[] = array(
                    'title'                 => ! empty($track['title']) ? (string) $track['title'] : basename((string) wp_parse_url($stream_url, PHP_URL_PATH)),
                    'artist'                => ! empty($track['artist']) ? (string) $track['artist'] : $album_artist,
                    'duration'              => $duration,
                    'preview_seconds'       => max(5, $preview_seconds),
                    'preview_start_seconds' => max(0, $preview_start_seconds),
                    'preview_end_seconds'   => $preview_end_seconds > $preview_start_seconds ? $preview_end_seconds : 0,
                    'stream_url'            => esc_url_raw($stream_url),
                    'web_file_url'          => ! empty($track['web_file_url']) ? esc_url_raw((string) $track['web_file_url']) : '',
                    'itunes_file_url'       => ! empty($track['itunes_file_url']) ? esc_url_raw((string) $track['itunes_file_url']) : '',
                );
            }

            if (! empty($rows)) {
                return $rows;
            }

            $child_ids = $this->get_album_child_product_ids($product);

            foreach ($child_ids as $child_id) {
                $child_product = function_exists('wc_get_product') ? wc_get_product($child_id) : null;
                $child_post = get_post($child_id);

                if (! $child_product || ! $child_post) {
                    continue;
                }

                $configured_stream_url = (string) get_post_meta($child_id, '_worldnew_music_stream_url', true);
                $stream_url = $this->resolve_music_stream_url($child_product, $configured_stream_url);

                if (! $stream_url) {
                    continue;
                }

                $preview_seconds = max(5, (int) get_post_meta($child_id, '_worldnew_music_preview_seconds', true) ?: 30);
                $preview_start_seconds = max(0, (int) get_post_meta($child_id, '_worldnew_music_preview_start_seconds', true));
                $preview_end_seconds = max(0, (int) get_post_meta($child_id, '_worldnew_music_preview_end_seconds', true));
                $duration = trim((string) get_post_meta($child_id, '_worldnew_music_duration', true));

                if ('' === $duration) {
                    $duration = gmdate('i:s', $preview_seconds);
                }

                $rows[] = array(
                    'title'                 => get_the_title($child_post),
                    'artist'                => (string) get_post_meta($child_id, '_worldnew_music_artist', true) ?: $album_artist,
                    'duration'              => $duration,
                    'preview_seconds'       => $preview_seconds,
                    'preview_start_seconds' => $preview_start_seconds,
                    'preview_end_seconds'   => $preview_end_seconds > $preview_start_seconds ? $preview_end_seconds : 0,
                    'stream_url'            => $stream_url,
                );
            }

            if (! empty($rows)) {
                return $rows;
            }

            if (! is_object($product) || ! method_exists($product, 'get_downloads')) {
                return $rows;
            }

            $downloads = $product->get_downloads();
            if (! is_array($downloads)) {
                return $rows;
            }

            foreach ($downloads as $download_file) {
                if (! $download_file || ! method_exists($download_file, 'get_enabled') || ! $download_file->get_enabled()) {
                    continue;
                }

                $file_url = method_exists($download_file, 'get_file') ? (string) $download_file->get_file() : '';
                if (! $file_url) {
                    continue;
                }

                $name = method_exists($download_file, 'get_name') ? (string) $download_file->get_name() : '';
                if (! $name) {
                    $name = basename((string) wp_parse_url($file_url, PHP_URL_PATH));
                }

                $preview_seconds = 30;
                $preview_start_seconds = 0;
                $preview_end_seconds = 0;

                $rows[] = array(
                    'title'                 => $name,
                    'artist'                => $album_artist,
                    'duration'              => gmdate('i:s', $preview_seconds),
                    'preview_seconds'       => $preview_seconds,
                    'preview_start_seconds' => $preview_start_seconds,
                    'preview_end_seconds'   => $preview_end_seconds > $preview_start_seconds ? $preview_end_seconds : 0,
                    'stream_url'            => esc_url_raw($file_url),
                );
            }

            return $rows;
        }

        private function format_album_track_count($count) {
            return sprintf('%d %s', (int) $count, 1 === (int) $count ? 'track' : 'tracks');
        }

        public function render_album_product_layout() {
            if (is_admin() || wp_doing_ajax()) {
                return;
            }

            if (! function_exists('is_product') || ! is_product()) {
                return;
            }

            $product_id = get_queried_object_id();
            $product = function_exists('wc_get_product') ? wc_get_product($product_id) : null;

            if (! $this->is_album_product_compatible($product, $product_id)) {
                return;
            }

            $tracks = $this->get_album_track_rows($product, $product_id);
            $title = get_the_title($product_id);
            $artist = (string) get_post_meta($product_id, '_worldnew_music_artist', true);
            $artist = $artist ? $artist : "Franke'";
            $about = trim((string) get_post_field('post_excerpt', $product_id));
            if (! $about) {
                $about = wp_trim_words(wp_strip_all_tags((string) get_post_field('post_content', $product_id)), 42);
            }
            $image_url = '';
            if (is_object($product) && method_exists($product, 'get_image_id')) {
                $image_id = (int) $product->get_image_id();
                if ($image_id > 0) {
                    $image_url = (string) wp_get_attachment_image_url($image_id, 'large');
                }
            }
            $released = get_the_date('F j, Y', $product_id);
            $donate_url = apply_filters('worldnew_album_donate_url', home_url('/donate/'), $product_id);
            $albums_url = get_term_link('album', 'product_cat');
            if (is_wp_error($albums_url)) {
                $albums_url = home_url('/');
            }
            $download_all_url = is_object($product) && method_exists($product, 'add_to_cart_url')
                ? $product->add_to_cart_url()
                : add_query_arg('add-to-cart', $product_id, home_url('/'));
            $price_html = is_object($product) && method_exists($product, 'get_price_html')
                ? $product->get_price_html()
                : '';

            status_header(200);
            nocache_headers();
            get_header();
            ?>
            <main class="worldnew-album-page">
                <section class="worldnew-album-shell">
                    <a class="worldnew-album-back" href="<?php echo esc_url($albums_url); ?>">← Back to Albums</a>

                    <div class="worldnew-album-hero">
                        <div class="worldnew-album-art-wrap">
                            <?php if ($image_url) : ?>
                                <img class="worldnew-album-art" src="<?php echo esc_url($image_url); ?>" alt="<?php echo esc_attr($title); ?>" />
                            <?php else : ?>
                                <div class="worldnew-album-art worldnew-album-art--empty"><?php echo esc_html($title); ?></div>
                            <?php endif; ?>
                        </div>

                        <div class="worldnew-album-copy">
                            <p class="worldnew-album-kicker">Album</p>
                            <h1><?php echo esc_html($title); ?></h1>
                            <p class="worldnew-album-artist"><?php echo esc_html($artist); ?> <span class="worldnew-album-artist-heart" aria-hidden="true"><svg viewBox="0 0 512 512" focusable="false"><path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8C512 115.5 461.8 56 392.4 44.6c-45.6-7.5-92 7.3-124.6 39.9L256 96.3l-11.8-11.8c-32.6-32.6-79-47.4-124.6-39.9C50.2 56 0 115.5 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"></path></svg></span></p>
                            <p class="worldnew-album-meta"><?php echo esc_html($this->format_album_track_count(count($tracks))); ?> • Released <?php echo esc_html($released); ?></p>
                            <?php if ($price_html) : ?>
                                <p class="worldnew-album-price"><?php echo wp_kses_post($price_html); ?></p>
                            <?php endif; ?>
                            <?php if ($about) : ?>
                                <p class="worldnew-album-summary hidden"><?php echo esc_html($about); ?></p>
                            <?php endif; ?>

                            <div class="worldnew-album-actions">
                                <button type="button" class="worldnew-album-btn worldnew-album-btn--primary" data-worldnew-album-play-all>
                                    <span aria-hidden="true">
                                        <svg viewBox="0 0 384 512" focusable="false">
                                            <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80v352c0 17.4 9.4 33.4 24.5 41.9S57.2 482.1 72 473l288-176c14.3-8.7 24-24.2 24-41s-9.7-32.2-24-41L73 39z"></path>
                                        </svg>
                                    </span>
                                    Play All
                                </button>
                                <a class="worldnew-album-btn worldnew-album-btn--ghost" href="<?php echo esc_url($download_all_url); ?>">
                                    <span aria-hidden="true">↓</span>
                                    Download All
                                </a>
                            </div>

                            <div class="worldnew-album-donate">
                                <span class="worldnew-album-heart" aria-hidden="true"><svg viewBox="0 0 512 512" focusable="false"><path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8C512 115.5 461.8 56 392.4 44.6c-45.6-7.5-92 7.3-124.6 39.9L256 96.3l-11.8-11.8c-32.6-32.6-79-47.4-124.6-39.9C50.2 56 0 115.5 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"></path></svg></span>
                                <div>
                                    <strong>Love this album?</strong>
                                    <span>Support the artist directly.</span>
                                </div>
                                <a href="<?php echo esc_url($donate_url); ?>">Donate</a>
                            </div>
                        </div>

                        <aside class="worldnew-album-about">
                            <h2>About this album</h2>
                            <p><?php echo esc_html($about ? $about : 'Thank you for listening.'); ?></p>
                            <dl>
                                <div><dt>Artist</dt><dd><?php echo esc_html($artist); ?></dd></div>
                                <div><dt>Release Date</dt><dd><?php echo esc_html($released); ?></dd></div>
                                <div><dt>Tracks</dt><dd><?php echo esc_html($this->format_album_track_count(count($tracks))); ?></dd></div>
                            </dl>
                        </aside>
                    </div>

                    <div class="worldnew-album-tabs" role="tablist" aria-label="Album information">
                        <button type="button" class="is-active" data-worldnew-album-tab="tracklist" role="tab" aria-selected="true">Tracklist</button>
                        <button type="button" data-worldnew-album-tab="details" role="tab" aria-selected="false">Details</button>
                        <button type="button" data-worldnew-album-tab="credits" role="tab" aria-selected="false">Credits</button>
                    </div>

                    <div class="worldnew-album-tab-panel is-active" data-worldnew-album-panel="tracklist">
                        <ol class="worldnew-album-tracklist">
                            <?php if (empty($tracks)) : ?>
                                <li class="worldnew-album-empty">No playable tracks have been added yet.</li>
                            <?php else : ?>
                                <?php foreach ($tracks as $index => $track) : ?>
                                    <?php
                                    $track_preview_seconds = max(5, ! empty($track['preview_seconds']) ? (int) $track['preview_seconds'] : 30);
                                    $track_preview_start_seconds = max(0, ! empty($track['preview_start_seconds']) ? (int) $track['preview_start_seconds'] : 0);
                                    $track_preview_end_seconds = max(0, ! empty($track['preview_end_seconds']) ? (int) $track['preview_end_seconds'] : 0);
                                    if ($track_preview_end_seconds > 0 && $track_preview_end_seconds <= $track_preview_start_seconds) {
                                        $track_preview_end_seconds = 0;
                                    }
                                    $duration = ! empty($track['duration']) ? (string) $track['duration'] : gmdate('i:s', $track_preview_seconds);
                                    ?>
                                    <li class="worldnew-album-track" data-worldnew-album-track>
                                        <span class="worldnew-album-track-number"><?php echo esc_html((string) ($index + 1)); ?></span>
                                        <span class="worldnew-album-track-copy">
                                            <strong><?php echo esc_html($track['title']); ?></strong>
                                            <small><?php echo esc_html(! empty($track['artist']) ? $track['artist'] : $artist); ?></small>
                                        </span>
                                        <button
                                            type="button"
                                            class="worldnew-album-track-play"
                                            data-worldnew-album-stream="<?php echo esc_url($track['stream_url']); ?>"
                                            data-worldnew-preview-seconds="<?php echo esc_attr((string) $track_preview_seconds); ?>"
                                            data-worldnew-preview-start-seconds="<?php echo esc_attr((string) $track_preview_start_seconds); ?>"
                                            data-worldnew-preview-end-seconds="<?php echo esc_attr((string) $track_preview_end_seconds); ?>"
                                            aria-label="<?php echo esc_attr('Play ' . $track['title']); ?>"
                                        >
                                            <span class="worldnew-album-play-icon" aria-hidden="true">
                                                <svg viewBox="0 0 384 512" focusable="false">
                                                    <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80v352c0 17.4 9.4 33.4 24.5 41.9S57.2 482.1 72 473l288-176c14.3-8.7 24-24.2 24-41s-9.7-32.2-24-41L73 39z"></path>
                                                </svg>
                                            </span>
                                            <span class="worldnew-album-pause-icon" aria-hidden="true">
                                                <svg viewBox="0 0 320 512" focusable="false">
                                                    <path d="M48 64C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48v288c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48h-32z"></path>
                                                </svg>
                                            </span>
                                        </button>
                                        <span class="worldnew-album-track-duration"><?php echo esc_html($duration); ?></span>
                                    </li>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </ol>
                    </div>
                    <div class="worldnew-album-tab-panel" data-worldnew-album-panel="details">
                        <?php echo wp_kses_post(wpautop($about ? $about : 'No album details have been added yet.')); ?>
                    </div>
                    <div class="worldnew-album-tab-panel" data-worldnew-album-panel="credits">
                        <p><?php echo esc_html($artist ? $artist : "Franke'"); ?></p>
                    </div>
                </section>
                <audio class="worldnew-album-audio" preload="none" playsinline></audio>
            </main>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap');
                .worldnew-album-page { min-height: 100vh; background: radial-gradient(circle at top right, rgba(248,57,169,.12), transparent 38%), #fff; padding: 34px 18px 70px; font-family: 'Bricolage Grotesque', 'Trebuchet MS', sans-serif; color: #111827; }
                .worldnew-album-page * { box-sizing: border-box; font-family: inherit; }
                .worldnew-album-shell { max-width: 1100px; margin: 0 auto; }
                .worldnew-album-back { display: inline-flex; margin-bottom: 26px; color: #F839A9; font-weight: 800; text-decoration: none; }
                .worldnew-album-hero { display: grid; grid-template-columns: minmax(260px, 370px) minmax(0, 1fr) minmax(230px, 300px); gap: 28px; align-items: start; }
                .worldnew-album-art-wrap { border-radius: 22px; box-shadow: 0 28px 55px -30px rgba(15,23,42,.65); overflow: hidden; }
                .worldnew-album-art { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; background: linear-gradient(135deg, #F839A9, #180510); color: #fff; }
                .worldnew-album-art--empty { display: grid; place-items: center; padding: 24px; font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 300; text-align: center; }
                .worldnew-album-kicker { margin: 0 0 6px; color: #F839A9; font-size: .78rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
                body .worldnew-album-page .worldnew-album-copy h1 { margin: 0; font-size: clamp(1.2rem, 2vw, 1.5rem) !important; line-height: 1.02; letter-spacing: -.055em; }
                .worldnew-album-artist { margin: 10px 0 8px; color: #F839A9; font-size: 1.1rem; font-weight: 800; }
                .worldnew-album-meta { margin: 0; color: #6b7280; font-weight: 600; }
                .worldnew-album-price { display: inline-flex; margin: 14px 0 0; border-radius: 999px; background: #fff0f8; padding: 9px 14px; color: #F839A9; font-size: 1rem; font-weight: 800; }
                .worldnew-album-price .amount { color: #F839A9; }
                .worldnew-album-summary { margin: 18px 0 0; max-width: 46ch; color: #111827; font-size: 1.05rem; line-height: 1.55; }
                .worldnew-album-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
                .worldnew-album-btn { border: 1px solid rgba(248,57,169,.24); border-radius: 999px; padding: 12px 20px; font-weight: 800; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; gap: 9px; }
                .worldnew-album-btn svg { width: 14px; height: 14px; display: block; fill: currentColor; }
                .worldnew-album-btn--primary { border-color: transparent; background: #F839A9; color: #fff; box-shadow: 0 18px 32px -22px rgba(248,57,169,.95); }
                .worldnew-album-btn--ghost { background: #fff; color: #F839A9; }
                .worldnew-album-donate { margin-top: 22px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: center; border: 1px solid rgba(248,57,169,.16); border-radius: 18px; padding: 14px; background: #fff5fb; box-shadow: 0 18px 40px -34px rgba(248,57,169,.75); }
                .worldnew-album-artist-heart { display: inline-flex; width: .82em; height: .82em; margin-left: 4px; color: #F839A9; vertical-align: -.05em; }
                .worldnew-album-artist-heart svg { display: block; width: 100%; height: 100%; fill: currentColor; }
                .worldnew-album-heart { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: #ffe4f4; color: #F839A9; }
                .worldnew-album-heart svg { display: block; width: 22px; height: 22px; fill: currentColor; margin-top:15px }
                .worldnew-album-donate strong, .worldnew-album-donate span { display: block; }
                .worldnew-album-donate span { color: #6b7280; font-size: .9rem; margin-top: 2px; }
                .worldnew-album-donate a { border-radius: 12px; padding: 12px 18px; background: #F839A9; color: #fff; text-decoration: none; font-weight: 800; }
                .worldnew-album-about { border-radius: 20px; padding: 24px; background: #fff; box-shadow: 0 22px 45px -38px rgba(15,23,42,.8); border: 1px solid #f1f5f9; }
                .worldnew-album-about h2 { margin: 0 0 14px; font-size: 1.15rem; }
                .worldnew-album-about p { color: #111827; line-height: 1.55; margin: 0 0 20px; }
                .worldnew-album-about dl { margin: 0; display: grid; gap: 12px; border-top: 1px solid #e5e7eb; padding-top: 18px; }
                .worldnew-album-about div { display: grid; grid-template-columns: 95px 1fr; gap: 12px; }
                .worldnew-album-about dt { color: #6b7280; }
                .worldnew-album-about dd { margin: 0; color: #111827; font-weight: 600; }
                .worldnew-album-tabs { display: flex; gap: 36px; margin: 42px 0 24px; border-bottom: 1px solid #f4cfe3; }
                .worldnew-album-tabs button { appearance: none; border: 0; border-bottom: 2px solid transparent; background: transparent; padding: 0 0 13px; color: #6b7280; font-size: .85rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; cursor: pointer; }
                .worldnew-album-tabs button.is-active { color: #F839A9; border-bottom-color: #F839A9; margin-bottom: -1px; }
                .worldnew-album-tab-panel { display: none; }
                .worldnew-album-tab-panel.is-active { display: block; }
                .worldnew-album-tab-panel:not([data-worldnew-album-panel="tracklist"]) { border: 1px solid #f7d8e9; border-radius: 18px; background: #fff; padding: 22px; color: #111827; line-height: 1.65; }
                .worldnew-album-tab-panel:not([data-worldnew-album-panel="tracklist"]) p { margin: 0 0 12px; }
                body .worldnew-album-page .worldnew-album-tracklist { margin: 0 !important; padding: 0 !important; list-style: none !important; border-radius: 18px; overflow: hidden; border: 1px solid #f7d8e9; background: #fff; }
                body .worldnew-album-page .worldnew-album-track { display: grid !important; grid-template-columns: 42px minmax(0, 1fr) 44px 72px !important; align-items: center !important; gap: 12px !important; min-height: 66px; padding: 10px 18px !important; border-bottom: 1px solid #f7d8e9; }
                body .worldnew-album-page .worldnew-album-track:last-child { border-bottom: 0; }
                body .worldnew-album-page .worldnew-album-track.is-playing { background: #fff0f8; }
                body .worldnew-album-page .worldnew-album-track-number { grid-column: 1 !important; color: #F839A9 !important; font-weight: 800; text-align: center; }
                body .worldnew-album-page .worldnew-album-track-copy { grid-column: 2 !important; min-width: 0; }
                body .worldnew-album-page .worldnew-album-track-copy strong { display: block; font-size: 1rem; line-height: 1.25; }
                body .worldnew-album-page .worldnew-album-track-copy small { display: block; margin-top: 3px; color: #6b7280; }
                body .worldnew-album-page .worldnew-album-track-play { grid-column: 3 !important; width: 34px !important; height: 34px !important; min-width: 34px !important; min-height: 34px !important; border: 0 !important; border-radius: 999px !important; background: #ffe4f4 !important; color: #F839A9 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; cursor: pointer; padding: 0 !important; margin: 0 !important; appearance: none; line-height: 1 !important; }
                body .worldnew-album-page .worldnew-album-track-play.is-playing { background: #F839A9 !important; color: #fff !important; }
                body .worldnew-album-page .worldnew-album-play-icon,
                body .worldnew-album-page .worldnew-album-pause-icon { display: inline-flex !important; align-items: center; justify-content: center; width: 14px; height: 14px; color: currentColor !important; }
                body .worldnew-album-page .worldnew-album-play-icon svg,
                body .worldnew-album-page .worldnew-album-pause-icon svg { display: block !important; width: 14px !important; height: 14px !important; fill: currentColor !important; }
                body .worldnew-album-page .worldnew-album-pause-icon { display: none !important; }
                body .worldnew-album-page .worldnew-album-track-play.is-playing .worldnew-album-play-icon { display: none !important; }
                body .worldnew-album-page .worldnew-album-track-play.is-playing .worldnew-album-pause-icon { display: inline-flex !important; }
                body .worldnew-album-page .worldnew-album-track-duration { grid-column: 4 !important; display: block !important; visibility: visible !important; opacity: 1 !important; color: #111827 !important; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; min-width: 58px; white-space: nowrap; }
                .worldnew-album-empty { padding: 22px; color: #6b7280; }
                .worldnew-album-audio { display: none; }
                @media (max-width: 960px) {
                    .worldnew-album-hero { grid-template-columns: minmax(0, 320px) minmax(0, 1fr); }
                    .worldnew-album-about { grid-column: 1 / -1; }
                }
                @media (max-width: 680px) {
                    .worldnew-album-page { padding: 22px 12px 46px; }
                    .worldnew-album-hero { grid-template-columns: 1fr; gap: 18px; }
                    .worldnew-album-art-wrap { max-width: 300px; }
                    body .worldnew-album-page .worldnew-album-copy h1 { font-size: 2rem!important; }
                    .worldnew-album-summary { font-size: .98rem; }
                    .worldnew-album-donate { grid-template-columns: auto 1fr; }
                    .worldnew-album-donate a { grid-column: 1 / -1; text-align: center; }
                    .worldnew-album-tabs { gap: 22px; margin-top: 30px; }
                    body .worldnew-album-page .worldnew-album-track { grid-template-columns: 26px minmax(0, 1fr) 32px 52px !important; gap: 7px !important; min-height: 58px; padding: 9px 10px !important; }
                    body .worldnew-album-page .worldnew-album-track-play { width: 28px !important; height: 28px !important; min-width: 28px !important; min-height: 28px !important; }
                    body .worldnew-album-page .worldnew-album-play-icon,
                    body .worldnew-album-page .worldnew-album-pause-icon { width: 11px; height: 11px; }
                    body .worldnew-album-page .worldnew-album-play-icon svg,
                    body .worldnew-album-page .worldnew-album-pause-icon svg { width: 11px !important; height: 11px !important; }
                    .worldnew-album-track-copy strong { font-size: .9rem; }
                    .worldnew-album-track-copy small { font-size: .78rem; }
                    body .worldnew-album-page .worldnew-album-track-duration { font-size: .88rem; min-width: 48px; }
                }
            </style>
            <script>
                (function(){
                    var page = document.querySelector('.worldnew-album-page');
                    if (!page) return;
                    var audio = page.querySelector('.worldnew-album-audio');
                    var buttons = Array.from(page.querySelectorAll('.worldnew-album-track-play'));
                    var rows = Array.from(page.querySelectorAll('[data-worldnew-album-track]'));
                    var playAll = page.querySelector('[data-worldnew-album-play-all]');
                    var tabs = Array.from(page.querySelectorAll('[data-worldnew-album-tab]'));
                    var panels = Array.from(page.querySelectorAll('[data-worldnew-album-panel]'));
                    var activeIndex = -1;
                    var previewEnd = 30;
                    var timer = null;

                    tabs.forEach(function(tab){
                        tab.addEventListener('click', function(){
                            var target = tab.getAttribute('data-worldnew-album-tab');
                            tabs.forEach(function(item){
                                var isActive = item === tab;
                                item.classList.toggle('is-active', isActive);
                                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
                            });
                            panels.forEach(function(panel){
                                panel.classList.toggle('is-active', panel.getAttribute('data-worldnew-album-panel') === target);
                            });
                        });
                    });

                    function clearState() {
                        buttons.forEach(function(button){ button.classList.remove('is-playing'); });
                        rows.forEach(function(row){ row.classList.remove('is-playing'); });
                        if (timer) {
                            window.clearInterval(timer);
                            timer = null;
                        }
                    }

                    function stopActive() {
                        audio.pause();
                        try {
                            audio.currentTime = 0;
                        } catch (error) {}
                        clearState();
                        activeIndex = -1;
                    }

                    function playIndex(index) {
                        var button = buttons[index];
                        if (!button) return;
                        var src = button.getAttribute('data-worldnew-album-stream');
                        var nextLimit = parseInt(button.getAttribute('data-worldnew-preview-seconds') || '30', 10);
                        var nextStart = parseInt(button.getAttribute('data-worldnew-preview-start-seconds') || '0', 10);
                        var nextEnd = parseInt(button.getAttribute('data-worldnew-preview-end-seconds') || '0', 10);
                        if (!src) return;

                        if (activeIndex === index && !audio.paused) {
                            stopActive();
                            return;
                        }

                        stopActive();
                        activeIndex = index;
                        var previewStart = isNaN(nextStart) ? 0 : Math.max(0, nextStart);
                        var previewLimit = isNaN(nextLimit) ? 30 : Math.max(5, nextLimit);
                        previewEnd = !isNaN(nextEnd) && nextEnd > previewStart ? nextEnd : previewStart + previewLimit;
                        audio.src = src;
                        try {
                            audio.currentTime = previewStart;
                        } catch (error) {}
                        button.classList.add('is-playing');
                        if (rows[index]) {
                            rows[index].classList.add('is-playing');
                        }
                        timer = window.setInterval(function(){
                            if (audio.currentTime >= previewEnd) {
                                stopActive();
                            }
                        }, 200);
                        audio.play().catch(function(){
                            stopActive();
                        });
                    }

                    buttons.forEach(function(button, index) {
                        button.addEventListener('click', function(){ playIndex(index); });
                    });

                    if (playAll) {
                        playAll.addEventListener('click', function(){ playIndex(activeIndex >= 0 ? activeIndex : 0); });
                    }

                    audio.addEventListener('ended', function(){
                        var nextIndex = activeIndex + 1;
                        if (buttons[nextIndex]) {
                            playIndex(nextIndex);
                            return;
                        }
                        stopActive();
                    });
                    audio.addEventListener('error', function(){
                        stopActive();
                    });
                })();
            </script>
            <?php
            get_footer();
            exit;
        }

        public function handle_lovebox_fast_checkout() {
            if (
                ! isset($_POST['lovebox_nonce']) ||
                ! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['lovebox_nonce'])), 'lovebox_fast_checkout')
            ) {
                wp_die('Invalid request');
            }

            $product_id = absint($_POST['product_id'] ?? 0);
            $quantity   = max(1, absint($_POST['quantity'] ?? 1));
            $payload    = $this->lovebox_normalize_form_payload($_POST);
            $product    = function_exists('wc_get_product') ? wc_get_product($product_id) : null;

            if (! $product_id || ! $this->is_lovebox_product_compatible($product, $product_id)) {
                wp_die('This product is not configured for the custom service layout.');
            }

            if (! class_exists('WooCommerce')) {
                wp_die('WooCommerce is required.');
            }

            $token = wp_generate_uuid4();
            set_transient(
                'lovebox_request_' . $token,
                array(
                    'product_id' => $product_id,
                    'fields'     => $payload,
                    'created_at' => time(),
                ),
                30 * MINUTE_IN_SECONDS
            );

            $redirect_url = add_query_arg(
                array(
                    'add-to-cart'    => $product_id,
                    'quantity'       => $quantity,
                    'lovebox_request'  => $token,
                ),
                wc_get_checkout_url()
            );

            wp_safe_redirect($redirect_url);
            exit;
        }

        public function attach_lovebox_cart_item_data($cart_item_data, $product_id) {
            if (empty($_GET['lovebox_request'])) {
                return $cart_item_data;
            }

            $token = sanitize_text_field(wp_unslash($_GET['lovebox_request']));
            $data  = get_transient('lovebox_request_' . $token);

            if (! is_array($data)) {
                return $cart_item_data;
            }

            if (! empty($data['product_id']) && (int) $data['product_id'] !== (int) $product_id) {
                return $cart_item_data;
            }

            $fields = isset($data['fields']) && is_array($data['fields']) ? $data['fields'] : array();
            if (empty($fields)) {
                return $cart_item_data;
            }

            $cart_item_data['_lovebox_request_data'] = $fields;
            $cart_item_data['_lovebox_request_token'] = $token;
            $cart_item_data['unique_key'] = md5(wp_json_encode($fields) . microtime(true));

            delete_transient('lovebox_request_' . $token);

            return $cart_item_data;
        }

        public function render_lovebox_cart_item_data($item_data, $cart_item) {
            $fields = isset($cart_item['_lovebox_request_data']) && is_array($cart_item['_lovebox_request_data'])
                ? $cart_item['_lovebox_request_data']
                : array();

            if (empty($fields)) {
                return $item_data;
            }

            foreach ($fields as $key => $value) {
                $item_data[] = array(
                    'key'     => $this->lovebox_field_label($key),
                    'value'   => wp_kses_post(nl2br(esc_html((string) $value))),
                    'display' => esc_html((string) $value),
                );
            }

            return $item_data;
        }

        public function attach_lovebox_order_line_item_meta($item, $cart_item_key, $values, $order) {
            $fields = isset($values['_lovebox_request_data']) && is_array($values['_lovebox_request_data'])
                ? $values['_lovebox_request_data']
                : array();

            if (empty($fields)) {
                return;
            }

            $item->add_meta_data('Cameo Request', $this->lovebox_payload_to_multiline_text($fields), true);
            $item->add_meta_data('_lovebox_request_json', wp_json_encode($fields), true);
        }

        public function attach_lovebox_order_meta($order, $data) {
            if (! function_exists('WC') || ! WC()->cart) {
                return;
            }

            $all_requests = array();

            foreach (WC()->cart->get_cart() as $cart_item) {
                if (empty($cart_item['_lovebox_request_data']) || ! is_array($cart_item['_lovebox_request_data'])) {
                    continue;
                }

                $all_requests[] = $cart_item['_lovebox_request_data'];
            }

            if (empty($all_requests)) {
                return;
            }

            $order->update_meta_data('_lovebox_request_payloads', wp_json_encode($all_requests));
        }

        public function render_lovebox_order_admin_panel($order) {
            if (! $order instanceof WC_Order) {
                return;
            }

            $raw = (string) $order->get_meta('_lovebox_request_payloads');
            if ($raw === '') {
                return;
            }

            $payloads = json_decode($raw, true);
            if (! is_array($payloads) || empty($payloads)) {
                return;
            }

            echo '<div style="margin-top:16px;padding:12px;border:1px solid #dcdcde;background:#fff;">';
            echo '<h3 style="margin:0 0 8px;">Cameo Request Details</h3>';

            foreach ($payloads as $index => $fields) {
                if (! is_array($fields) || empty($fields)) {
                    continue;
                }

                echo '<table class="widefat striped" style="margin-bottom:12px;">';
                echo '<thead><tr><th colspan="2">Request #' . esc_html((string) ($index + 1)) . '</th></tr></thead>';
                echo '<tbody>';
                foreach ($fields as $key => $value) {
                    echo '<tr>';
                    echo '<td style="width:180px;"><strong>' . esc_html($this->lovebox_field_label($key)) . '</strong></td>';
                    echo '<td>' . nl2br(esc_html((string) $value)) . '</td>';
                    echo '</tr>';
                }
                echo '</tbody></table>';
            }

            echo '</div>';
        }

        private function cart_has_only_lovebox_products() {
            if (! function_exists('WC') || ! WC()->cart || WC()->cart->is_empty()) {
                return false;
            }

            foreach (WC()->cart->get_cart() as $cart_item) {
                $product_id = ! empty($cart_item['product_id']) ? (int) $cart_item['product_id'] : 0;
                $product = $product_id > 0 && function_exists('wc_get_product') ? wc_get_product($product_id) : null;

                if (! $this->is_lovebox_product_compatible($product, $product_id)) {
                    return false;
                }
            }

            return true;
        }

        public function filter_lovebox_checkout_fields($fields) {
            if (! $this->cart_has_only_lovebox_products()) {
                return $fields;
            }

            $keep = array(
                'billing_first_name',
                'billing_last_name',
                'billing_email',
                'billing_phone',
            );

            foreach ($fields['billing'] as $key => $field) {
                if (! in_array($key, $keep, true)) {
                    unset($fields['billing'][$key]);
                }
            }

            $fields['shipping'] = array();

            return $fields;
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
                'target'        => '',
            );
            $args = wp_parse_args($args, $defaults);
            $target = in_array($args['target'], array('website', 'community'), true) ? $args['target'] : '';

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

                $show_on_website = 'no' !== get_post_meta($post->ID, '_worldnew_music_show_on_website', true);
                $show_on_community = 'no' !== get_post_meta($post->ID, '_worldnew_music_show_on_community', true);

                if ('website' === $target && ! $show_on_website) {
                    continue;
                }

                if ('community' === $target && ! $show_on_community) {
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
                $community_playback_mode = (string) get_post_meta($post->ID, '_worldnew_music_community_playback_mode', true);
                if (! in_array($community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                    $community_playback_mode = 'preview';
                }
                $preview_seconds = (int) get_post_meta($post->ID, '_worldnew_music_preview_seconds', true);
                if ($preview_seconds < 5) {
                    $preview_seconds = 30;
                }
                $preview_start_seconds = max(0, (int) get_post_meta($post->ID, '_worldnew_music_preview_start_seconds', true));
                $preview_end_seconds = max(0, (int) get_post_meta($post->ID, '_worldnew_music_preview_end_seconds', true));
                if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                    $preview_end_seconds = 0;
                }
                $community_price_override = $this->get_community_price_override_for_product($post->ID);

                $rows[] = array(
                    'id'               => (int) $post->ID,
                    'title'            => get_the_title($post),
                    'artist'           => (string) get_post_meta($post->ID, '_worldnew_music_artist', true),
                    'genre'            => (string) get_post_meta($post->ID, '_worldnew_music_genre', true),
                    'duration'         => (string) get_post_meta($post->ID, '_worldnew_music_duration', true),
                    'preview_seconds'  => $preview_seconds,
                    'preview_start_seconds' => $preview_start_seconds,
                    'preview_end_seconds' => $preview_end_seconds,
                    'cover_image_url'  => $cover_image_url,
                    'stream_url'       => $resolved_stream_url,
                    'price'            => '' !== $price ? (float) $price : null,
                    'community_price'  => $community_price_override ? (float) $community_price_override['amount'] : null,
                    'currency'         => $currency,
                    'checkout_url'     => $checkout_url,
                    'community_checkout_url' => $this->get_app_product_checkout_url($post->ID),
                    'product_url'      => get_permalink($post->ID),
                    'is_featured'      => get_post_meta($post->ID, '_worldnew_music_featured', true) === 'yes',
                    'show_on_website'  => $show_on_website,
                    'show_on_community' => $show_on_community,
                    'community_playback_mode' => $community_playback_mode,
                    'can_download'     => ! empty($download_info['can_download']),
                    'download_url'     => isset($download_info['download_url']) ? (string) $download_info['download_url'] : '',
                );
            }

            wp_reset_postdata();

            return $rows;
        }

        private function get_music_product_payload($post, $product = null) {
            if (! $post) {
                return null;
            }

            if (! $product && function_exists('wc_get_product')) {
                $product = wc_get_product($post->ID);
            }

            $category_slugs = wp_get_post_terms($post->ID, 'product_cat', array('fields' => 'slugs'));
            $category_slugs = is_array($category_slugs) ? $category_slugs : array();
            $is_album = in_array('album', $category_slugs, true);
            if (! $is_album && ! $this->is_music_product_compatible($product, $post->ID)) {
                return null;
            }

            $price = $product && method_exists($product, 'get_price') ? $product->get_price() : '';
            $currency = function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : 'GBP';
            $configured_stream_url = (string) get_post_meta($post->ID, '_worldnew_music_stream_url', true);
            $resolved_stream_url = $this->resolve_music_stream_url($product, $configured_stream_url);
            $cover_image_url = (string) get_post_meta($post->ID, '_worldnew_music_cover_url', true);

            if (! $cover_image_url && is_object($product) && method_exists($product, 'get_image_id')) {
                $image_id = (int) $product->get_image_id();
                if ($image_id > 0) {
                    $cover_image_url = (string) wp_get_attachment_image_url($image_id, 'large');
                }
            }

            $community_playback_mode = (string) get_post_meta($post->ID, '_worldnew_music_community_playback_mode', true);
            if (! in_array($community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $community_playback_mode = 'preview';
            }

            $album_community_playback_mode = (string) get_post_meta($post->ID, '_worldnew_album_community_playback_mode', true);
            if (! in_array($album_community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $album_community_playback_mode = $community_playback_mode;
            }

            $preview_seconds = (int) get_post_meta($post->ID, '_worldnew_music_preview_seconds', true);
            if ($preview_seconds < 5) {
                $preview_seconds = 30;
            }
            $preview_start_seconds = max(0, (int) get_post_meta($post->ID, '_worldnew_music_preview_start_seconds', true));
            $preview_end_seconds = max(0, (int) get_post_meta($post->ID, '_worldnew_music_preview_end_seconds', true));
            if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                $preview_end_seconds = 0;
            }

            $album_tracks = array();

            if ($is_album) {
                foreach ($this->get_album_track_rows($product, $post->ID) as $index => $track) {
                    $album_tracks[] = array(
                        'id'                      => (int) $post->ID + $index + 1,
                        'title'                   => (string) $track['title'],
                        'artist'                  => (string) $track['artist'],
                        'genre'                   => (string) get_post_meta($post->ID, '_worldnew_music_genre', true),
                        'duration'                => (string) $track['duration'],
                        'preview_seconds'         => ! empty($track['preview_seconds']) ? (int) $track['preview_seconds'] : 30,
                        'preview_start_seconds'   => isset($track['preview_start_seconds']) ? (int) $track['preview_start_seconds'] : $preview_start_seconds,
                        'preview_end_seconds'     => isset($track['preview_end_seconds']) ? (int) $track['preview_end_seconds'] : $preview_end_seconds,
                        'cover_image_url'         => $cover_image_url,
                        'stream_url'              => (string) $track['stream_url'],
                        'web_file_url'            => ! empty($track['web_file_url']) ? (string) $track['web_file_url'] : (string) $track['stream_url'],
                        'itunes_file_url'         => ! empty($track['itunes_file_url']) ? (string) $track['itunes_file_url'] : '',
                        'price'                   => null,
                        'community_price'         => null,
                        'display_price'           => null,
                        'currency'                => $currency,
                        'checkout_url'            => get_permalink($post->ID),
                        'community_checkout_url'  => $this->get_app_product_checkout_url($post->ID),
                        'product_url'             => get_permalink($post->ID),
                        'is_featured'             => false,
                        'show_on_website'         => true,
                        'show_on_community'       => get_post_meta($post->ID, '_worldnew_album_show_on_community', true) === 'yes',
                        'community_playback_mode' => $album_community_playback_mode,
                        'can_download'            => false,
                        'download_url'            => '',
                    );
                }
            }

            return array(
                'id'                      => (int) $post->ID,
                'kind'                    => $is_album ? 'bundle' : 'track',
                'title'                   => get_the_title($post),
                'artist'                  => (string) get_post_meta($post->ID, '_worldnew_music_artist', true),
                'genre'                   => (string) get_post_meta($post->ID, '_worldnew_music_genre', true),
                'description'             => (string) $post->post_content,
                'short_description'       => (string) $post->post_excerpt,
                'duration'                => (string) get_post_meta($post->ID, '_worldnew_music_duration', true),
                'preview_seconds'         => $preview_seconds,
                'preview_start_seconds'   => $preview_start_seconds,
                'preview_end_seconds'     => $preview_end_seconds,
                'stream_url'              => $resolved_stream_url,
                'cover_image_url'         => $cover_image_url,
                'price'                   => $normal_price,
                'community_price'         => $community_price,
                'display_price'           => null !== $community_price ? $community_price : $normal_price,
                'currency'                => $currency,
                'is_featured'             => get_post_meta($post->ID, '_worldnew_music_featured', true) === 'yes',
                'show_on_website'         => 'no' !== get_post_meta($post->ID, '_worldnew_music_show_on_website', true),
                'show_on_community'       => 'no' !== get_post_meta($post->ID, '_worldnew_music_show_on_community', true),
                'album_show_on_community' => get_post_meta($post->ID, '_worldnew_album_show_on_community', true) === 'yes',
                'community_playback_mode' => $is_album ? $album_community_playback_mode : $community_playback_mode,
                'status'                  => $post->post_status,
                'published_at'            => get_the_date('c', $post),
                'product_url'             => get_permalink($post->ID),
                'community_checkout_url'  => $this->get_app_product_checkout_url($post->ID),
                'edit_url'                => get_edit_post_link($post->ID, ''),
                'category_slugs'          => $category_slugs,
                'album_package'           => array(
                    'zip_url'              => (string) get_post_meta($post->ID, '_worldnew_album_package_zip_url', true),
                    'tracklist_pdf_url'    => (string) get_post_meta($post->ID, '_worldnew_album_tracklist_pdf_url', true),
                    'thankyou_pdf_url'     => (string) get_post_meta($post->ID, '_worldnew_album_thankyou_pdf_url', true),
                    'itunes_guide_pdf_url' => (string) get_post_meta($post->ID, '_worldnew_album_itunes_guide_pdf_url', true),
                ),
                'album_package_mode'      => (string) get_post_meta($post->ID, '_worldnew_album_package_mode', true),
                'album_community_offer'   => array(
                    'price'                         => (string) get_post_meta($post->ID, '_worldnew_album_community_price', true),
                    'track_price'                   => (string) get_post_meta($post->ID, '_worldnew_music_community_price', true),
                    'enable_offer_price'            => get_post_meta($post->ID, '_worldnew_album_enable_offer_price', true) === 'yes',
                    'minimum_offer_price'           => (string) get_post_meta($post->ID, '_worldnew_album_minimum_offer_price', true),
                    'enable_donation'               => get_post_meta($post->ID, '_worldnew_album_enable_donation', true) === 'yes',
                    'allow_individual_track_sales'  => get_post_meta($post->ID, '_worldnew_album_allow_individual_track_sales', true) === 'yes',
                ),
                'album_track_product_ids' => array_values(array_filter(array_map('absint', (array) get_post_meta($post->ID, '_worldnew_album_track_product_ids', true)))),
                'bundle_tracks'           => $album_tracks,
            );
        }

        private function get_video_product_payload($post, $product = null) {
            if (! $post) {
                return null;
            }

            if (! $product && function_exists('wc_get_product')) {
                $product = wc_get_product($post->ID);
            }

            if (! $this->is_video_product_compatible($product, $post->ID)) {
                return null;
            }

            $show_on_community = get_post_meta($post->ID, '_worldnew_video_show_on_community', true) === 'yes';
            $community_category = (string) get_post_meta($post->ID, '_worldnew_video_community_category', true);
            if (! in_array($community_category, array('movies', 'reels', 'mixtapes', 'behind-the-scenes'), true)) {
                $community_category = 'behind-the-scenes';
            }

            $playback_mode = (string) get_post_meta($post->ID, '_worldnew_video_community_playback_mode', true);
            if (! in_array($playback_mode, array('full', 'members_full'), true)) {
                $playback_mode = 'full';
            }

            $preview_seconds = (int) get_post_meta($post->ID, '_worldnew_video_preview_seconds', true);
            if ($preview_seconds < 5) {
                $preview_seconds = 30;
            }
            $preview_start_seconds = max(0, (int) get_post_meta($post->ID, '_worldnew_video_preview_start_seconds', true));
            $preview_end_seconds = max(0, (int) get_post_meta($post->ID, '_worldnew_video_preview_end_seconds', true));
            if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                $preview_end_seconds = 0;
            }

            $poster_url = (string) get_post_meta($post->ID, '_worldnew_video_poster_url', true);
            if (! $poster_url && is_object($product) && method_exists($product, 'get_image_id')) {
                $image_id = (int) $product->get_image_id();
                if ($image_id > 0) {
                    $poster_url = (string) wp_get_attachment_image_url($image_id, 'large');
                }
            }

            $category_slugs = wp_get_post_terms($post->ID, 'product_cat', array('fields' => 'slugs'));
            $category_slugs = is_array($category_slugs) ? $category_slugs : array();
            $price = $product && method_exists($product, 'get_price') ? $product->get_price() : '';

            return array(
                'id'                      => (int) $post->ID,
                'kind'                    => 'video',
                'title'                   => get_the_title($post),
                'description'             => (string) $post->post_content,
                'short_description'       => (string) $post->post_excerpt,
                'duration'                => '',
                'preview_seconds'         => $preview_seconds,
                'preview_start_seconds'   => $preview_start_seconds,
                'preview_end_seconds'     => $preview_end_seconds,
                'stream_url'              => $this->resolve_video_stream_url($product, (string) get_post_meta($post->ID, '_worldnew_video_stream_url', true)),
                'cover_image_url'         => $poster_url,
                'poster_image_url'        => $poster_url,
                'price'                   => '' !== $price ? (float) $price : null,
                'currency'                => function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : 'GBP',
                'is_featured'             => false,
                'show_on_website'         => false,
                'show_on_community'       => $show_on_community,
                'album_show_on_community' => false,
                'community_playback_mode' => $playback_mode,
                'community_category'      => $community_category,
                'status'                  => $post->post_status,
                'product_url'             => get_permalink($post->ID),
                'edit_url'                => get_edit_post_link($post->ID, ''),
                'category_slugs'          => $category_slugs,
                'bundle_tracks'           => array(),
            );
        }

        public function handle_rest_music_admin_list($request) {
            $validated = $this->validate_signed_rest_request($request);

            if (is_wp_error($validated)) {
                return $validated;
            }

            $query = new WP_Query(array(
                'post_type'      => 'product',
                'post_status'    => array('publish', 'draft', 'pending', 'private'),
                'posts_per_page' => 250,
                'orderby'        => 'date',
                'order'          => 'DESC',
            ));

            $products = array();

            foreach ($query->posts as $post) {
                $payload = $this->get_music_product_payload($post);
                if (! $payload) {
                    $payload = $this->get_video_product_payload($post);
                }
                if ($payload) {
                    $products[] = $payload;
                }
            }

            wp_reset_postdata();

            return new WP_REST_Response(array(
                'success'  => true,
                'products' => $products,
            ), 200);
        }

        public function handle_rest_music_admin_upsert($request) {
            $params = $this->validate_signed_rest_request($request);

            if (is_wp_error($params)) {
                return $params;
            }

            $product_id = isset($params['product_id']) ? absint($params['product_id']) : 0;
            $title = isset($params['title']) ? sanitize_text_field($params['title']) : '';
            $kind = isset($params['kind']) ? sanitize_key($params['kind']) : 'track';
            $is_album_upsert = 'bundle' === $kind || 'album' === $kind;

            if (! $title) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => $is_album_upsert ? 'Album title is required.' : 'Track title is required.',
                ), 400);
            }

            $postarr = array(
                'post_title'   => $title,
                'post_content' => isset($params['description']) ? wp_kses_post($params['description']) : '',
                'post_status'  => isset($params['status']) ? sanitize_key($params['status']) : 'publish',
                'post_type'    => 'product',
            );

            if ($product_id > 0) {
                $postarr['ID'] = $product_id;
                $saved_id = wp_update_post($postarr, true);
            } else {
                $saved_id = wp_insert_post($postarr, true);
            }

            if (is_wp_error($saved_id)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'error'   => $saved_id->get_error_message(),
                ), 400);
            }

            $product_id = (int) $saved_id;
            $price = isset($params['price']) ? (string) $params['price'] : '';
            if ('' !== $price && is_numeric($price)) {
                $this->update_wc_price_fields($product_id, number_format((float) $price, 2, '.', ''));
            }

            update_post_meta($product_id, '_worldnew_music_enabled', 'yes');
            update_post_meta($product_id, '_worldnew_music_artist', isset($params['artist']) ? sanitize_text_field($params['artist']) : '');
            update_post_meta($product_id, '_worldnew_music_genre', isset($params['genre']) ? sanitize_text_field($params['genre']) : '');
            update_post_meta($product_id, '_worldnew_music_duration', isset($params['duration']) ? sanitize_text_field($params['duration']) : '');
            update_post_meta($product_id, '_worldnew_music_preview_seconds', isset($params['preview_seconds']) ? max(5, min(600, absint($params['preview_seconds']))) : 30);
            $preview_start_seconds = isset($params['preview_start_seconds']) ? absint($params['preview_start_seconds']) : 0;
            $preview_end_seconds = isset($params['preview_end_seconds']) ? absint($params['preview_end_seconds']) : 0;
            if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                $preview_end_seconds = 0;
            }
            update_post_meta($product_id, '_worldnew_music_preview_start_seconds', $preview_start_seconds);
            update_post_meta($product_id, '_worldnew_music_preview_end_seconds', $preview_end_seconds);
            update_post_meta($product_id, '_worldnew_music_community_price', isset($params['community_price']) ? sanitize_text_field((string) $params['community_price']) : '');
            update_post_meta($product_id, '_worldnew_music_featured', ! empty($params['is_featured']) ? 'yes' : 'no');
            update_post_meta($product_id, '_worldnew_music_show_on_website', array_key_exists('show_on_website', $params) && ! $params['show_on_website'] ? 'no' : 'yes');
            update_post_meta($product_id, '_worldnew_music_show_on_community', array_key_exists('show_on_community', $params) && ! $params['show_on_community'] ? 'no' : 'yes');
            $album_show_on_community = $is_album_upsert && (array_key_exists('album_show_on_community', $params) ? ! empty($params['album_show_on_community']) : true);
            update_post_meta($product_id, '_worldnew_album_show_on_community', $album_show_on_community ? 'yes' : 'no');

            $community_playback_mode = isset($params['community_playback_mode']) ? sanitize_text_field($params['community_playback_mode']) : 'preview';
            if (! in_array($community_playback_mode, array('preview', 'full', 'members_full'), true)) {
                $community_playback_mode = 'preview';
            }
            update_post_meta($product_id, '_worldnew_music_community_playback_mode', $community_playback_mode);
            update_post_meta($product_id, '_worldnew_album_community_playback_mode', $community_playback_mode);

            if ($is_album_upsert) {
                $album_package_mode = isset($params['album_package_mode']) ? sanitize_text_field((string) $params['album_package_mode']) : '';
                if (! in_array($album_package_mode, array('existing_tracks', 'zip_package'), true)) {
                    $album_package_mode = array_key_exists('album_track_product_ids', $params) && is_array($params['album_track_product_ids']) && ! empty($params['album_track_product_ids'])
                        ? 'existing_tracks'
                        : 'zip_package';
                }
                update_post_meta($product_id, '_worldnew_album_package_mode', $album_package_mode);
                update_post_meta($product_id, '_worldnew_album_package_zip_url', 'zip_package' === $album_package_mode && isset($params['album_package_zip_url']) ? esc_url_raw((string) $params['album_package_zip_url']) : '');
                update_post_meta($product_id, '_worldnew_album_community_price', isset($params['album_community_price']) ? sanitize_text_field((string) $params['album_community_price']) : '');
                update_post_meta($product_id, '_worldnew_album_enable_offer_price', ! empty($params['album_enable_offer_price']) ? 'yes' : 'no');
                update_post_meta($product_id, '_worldnew_album_minimum_offer_price', isset($params['album_minimum_offer_price']) ? sanitize_text_field((string) $params['album_minimum_offer_price']) : '');
                update_post_meta($product_id, '_worldnew_album_enable_donation', ! empty($params['album_enable_donation']) ? 'yes' : 'no');
                update_post_meta($product_id, '_worldnew_album_allow_individual_track_sales', ! empty($params['album_allow_individual_track_sales']) ? 'yes' : 'no');
                $this->sync_album_product_type_for_package_mode($product_id, $album_package_mode);
                if ('existing_tracks' === $album_package_mode) {
                    if (array_key_exists('album_track_product_ids', $params) && is_array($params['album_track_product_ids'])) {
                        $this->sync_album_tracks_from_product_ids($product_id, $params['album_track_product_ids']);
                    } else {
                        delete_post_meta($product_id, '_worldnew_album_tracks');
                    }
                } elseif ('zip_package' === $album_package_mode) {
                    update_post_meta($product_id, '_worldnew_album_track_product_ids', array());
                }
                $this->sync_album_package_download($product_id, (string) get_post_meta($product_id, '_worldnew_album_package_zip_url', true));
            }

            $this->assign_album_product_category($product_id, $is_album_upsert);

            if (isset($params['stream_url']) && trim((string) $params['stream_url'])) {
                update_post_meta($product_id, '_worldnew_music_stream_url', esc_url_raw((string) $params['stream_url']));
            }

            if (isset($params['cover_image_url']) && trim((string) $params['cover_image_url'])) {
                update_post_meta($product_id, '_worldnew_music_cover_url', esc_url_raw((string) $params['cover_image_url']));
            }

            if (function_exists('wc_get_product')) {
                $product = wc_get_product($product_id);
                if ($product && method_exists($product, 'save')) {
                    if (method_exists($product, 'set_virtual')) {
                        $product->set_virtual(true);
                    }
                    if (method_exists($product, 'set_downloadable')) {
                        $product->set_downloadable(true);
                    }
                    $product->save();
                }
            }

            $post = get_post($product_id);
            $payload = $post ? $this->get_music_product_payload($post) : null;

            return new WP_REST_Response(array(
                'success' => true,
                'product' => $payload,
            ), 200);
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

        private function is_video_product_compatible($product, $post_id) {
            $enabled = get_post_meta($post_id, '_worldnew_video_enabled', true) === 'yes';
            $stream_url = trim((string) get_post_meta($post_id, '_worldnew_video_stream_url', true));
            $category_slugs = wp_get_post_terms($post_id, 'product_cat', array('fields' => 'slugs'));
            $category_slugs = is_array($category_slugs) ? $category_slugs : array();

            if ($enabled || $stream_url || in_array('videos', $category_slugs, true)) {
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
                if ($file_url && preg_match('/\.(mp4|m4v|mov|webm|ogv)(\?.*)?$/i', $file_url)) {
                    return true;
                }
            }

            return false;
        }

        private function resolve_video_stream_url($product, $configured_stream_url = '') {
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
                if ($file_url && preg_match('/\.(mp4|m4v|mov|webm|ogv)(\?.*)?$/i', $file_url)) {
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

        private function get_app_product_checkout_url($product_id) {
            $settings = $this->get_settings();
            $app_base_url = ! empty($settings['app_base_url']) ? untrailingslashit($settings['app_base_url']) : '';

            if (! $app_base_url) {
                return get_permalink((int) $product_id);
            }

            return $app_base_url . '/checkout/product/' . rawurlencode((string) (int) $product_id);
        }

        public function render_music_catalog_page() {
            if (! current_user_can('manage_options') && ! current_user_can('manage_woocommerce')) {
                return;
            }

            $tracks = $this->get_music_tracks(array('limit' => 250));
            ?>
            <div class="wrap">
                <h1>World New Music Catalog</h1>
                <p>Manage track metadata directly on WooCommerce products. Open a product and update the <strong>World New Music</strong> settings inside the downloadable product data section.</p>
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
                            <th>Display</th>
                            <th>Community Playback</th>
                            <th>Stream URL</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($tracks)) : ?>
                            <tr><td colspan="11">No music tracks found yet. Enable a product as music in the product editor.</td></tr>
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
                                        <?php
                                        $display_targets = array();
                                        if (! empty($track['show_on_website'])) {
                                            $display_targets[] = 'Website';
                                        }
                                        if (! empty($track['show_on_community'])) {
                                            $display_targets[] = 'Community';
                                        }
                                        echo esc_html(! empty($display_targets) ? implode(', ', $display_targets) : 'Hidden');
                                        ?>
                                    </td>
                                    <td><?php echo esc_html(ucwords(str_replace('_', ' ', (string) $track['community_playback_mode']))); ?></td>
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
                'target'        => 'website',
            ));

            if (empty($tracks) && 'yes' === strtolower((string) $atts['featured'])) {
                $tracks = $this->get_music_tracks(array(
                    'limit'         => (int) $atts['limit'],
                    'featured_only' => false,
                    'target'        => 'website',
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
            <section class="worldnew-music-player-shell ">
                <audio id="worldnew-music-preview-audio" preload="none" playsinline class="worldnew-audio-el"></audio>
                <div class="worldnew-music-player-head">
                    <div class="worldnew-artist-lockup">
                        <?php if ($artist_image_url) : ?>
                            <img class="worldnew-artist-photo" src="<?php echo esc_url($artist_image_url); ?>" alt="franke." />
                        <?php endif; ?>
                        <div>
                            <h3>franke.</h3>
                            <p>Top tracks</p>
                            <a class="worldnew-ui-pill worldnew-ui-pill--follow worldnew-community-join" href="https://community.worldnew.love">Join the community</a>
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
                        <?php
                        $preview_start_seconds = ! empty($track['preview_start_seconds']) ? (int) $track['preview_start_seconds'] : 0;
                        $preview_end_seconds = ! empty($track['preview_end_seconds']) ? (int) $track['preview_end_seconds'] : 0;
                        if ($preview_end_seconds > 0 && $preview_end_seconds <= $preview_start_seconds) {
                            $preview_end_seconds = 0;
                        }
                        $preview_display_seconds = $preview_end_seconds > $preview_start_seconds
                            ? $preview_end_seconds - $preview_start_seconds
                            : max(5, $preview_seconds);
                        ?>
                        <div class="worldnew-track-actions">
                            <a class="worldnew-price-pill" href="<?php echo esc_url($action_url); ?>">
                                <span class="screen-reader-text"><?php echo ! empty($track['can_download']) ? 'Download' : esc_html($price_label); ?></span>
                                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2ZM1 2v2h2l3.6 7.59-1.35 2.45C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03L21 5H5.21l-.94-2H1Zm16 16c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2Z"></path>
                                </svg>
                            </a>
                            <?php if (! empty($track['stream_url'])) : ?>
                                <button
                                    type="button"
                                    class="worldnew-track-play"
                                    data-worldnew-stream="<?php echo esc_url($track['stream_url']); ?>"
                                    data-worldnew-preview-seconds="<?php echo esc_attr((string) max(5, $preview_seconds)); ?>"
                                    data-worldnew-preview-start-seconds="<?php echo esc_attr((string) max(0, $preview_start_seconds)); ?>"
                                    data-worldnew-preview-end-seconds="<?php echo esc_attr((string) max(0, $preview_end_seconds)); ?>"
                                    aria-label="<?php echo esc_attr('Play preview for ' . $track['title']); ?>"
                                >
                                    <span class="worldnew-play-icon" aria-hidden="true">
                                        <svg viewBox="0 0 384 512" focusable="false">
                                            <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80v352c0 17.4 9.4 33.4 24.5 41.9S57.2 482.1 72 473l288-176c14.3-8.7 24-24.2 24-41s-9.7-32.2-24-41L73 39z"></path>
                                        </svg>
                                    </span>
                                    <span class="worldnew-pause-icon" aria-hidden="true">
                                        <svg viewBox="0 0 320 512" focusable="false">
                                            <path d="M48 64C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48v288c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48h-32z"></path>
                                        </svg>
                                    </span>
                                </button>
                            <?php endif; ?>
                            <span class="worldnew-track-time" data-worldnew-initial-time="<?php echo esc_attr(gmdate('i:s', max(5, $preview_display_seconds))); ?>"><?php echo esc_html(gmdate('i:s', max(5, $preview_display_seconds))); ?></span>
                        </div>
                    </li>
                <?php endforeach; ?>
                </ol>
            </section>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap');
                .worldnew-music-player-shell { border:1px solid rgba(248,57,169,.35); border-radius:20px; padding:24px; background:#fff; color:#111827; box-shadow:0 20px 38px rgba(248,57,169,.12); font-family:'Bricolage Grotesque', 'Trebuchet MS', sans-serif; }
                .worldnew-music-player-shell * { box-sizing:border-box; font-family:inherit; }
                .worldnew-music-player-head { display:flex; justify-content:space-between; gap:20px; padding-bottom:10px; }
                .worldnew-artist-lockup { display:flex; gap:18px; align-items:flex-end; }
                .worldnew-artist-photo { width:164px; height:164px; object-fit:cover; border-radius:24px!important; }
                .worldnew-artist-lockup h3 { margin:0; color:#1f1f1f; font-size:40px; line-height:.95; font-weight:800; letter-spacing:-.04em; }
                .worldnew-artist-lockup p { margin:8px 0 10px; color:#F839A9; font-size:16px; font-weight:700; }
                .worldnew-wordmark { width:172px; height:auto; align-self:flex-start; object-fit:contain; }
                .worldnew-wordmark-text { align-self:flex-start; font-size:24px; font-style:italic; color:#111827; }
                .worldnew-ui-pill { display:inline-flex; align-items:center; justify-content:center; border-radius:8px; background:#202020; color:#fff; font-weight:600; line-height:1; pointer-events:none; user-select:none; }
                .worldnew-ui-pill--follow { min-height:30px; padding:7px 16px; font-size:16px; }
                .worldnew-community-join { pointer-events:auto; text-decoration:none!important; color:#fff!important; }
                .worldnew-community-join:hover, .worldnew-community-join:focus { color:#fff!important; text-decoration:none!important; filter:brightness(.95); }
                .worldnew-preview-rail { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:28px; margin:22px 0 10px; }
                .worldnew-ui-pill--preview { min-height:28px; padding:7px 16px; font-size:15px; }
                .worldnew-preview-line { display:block; height:2px; background:rgba(248,57,169,.35); }
                .worldnew-track-list { list-style:none; margin:0; padding:0; }
                .worldnew-track-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:16px; border-bottom:1px solid rgba(248,57,169,.18); padding:15px 0; }
                .worldnew-track-row:last-child { border-bottom:0; }
                .worldnew-track-main { display:grid; grid-template-columns:18px 34px minmax(0,1fr); align-items:center; gap:12px; min-width:0; }
                .worldnew-drop { color:#F839A9; display:inline-flex; align-items:center; justify-content:center; line-height:1; }
                .worldnew-drop svg { width:12px; height:12px; display:block; fill:currentColor; }
                .worldnew-track-number { color:#F839A9; font-weight:700; font-size:15px; text-align:right; }
                .worldnew-track-copy { min-width:0; }
                .worldnew-track-copy strong { display:block; color:#111827; font-size:17px; font-weight:600; overflow-wrap:anywhere; letter-spacing:-.015em; }
                .worldnew-track-copy small { display:block; margin-top:2px; color:#6b7280; font-size:13px; }
                .worldnew-track-actions { display:flex; align-items:center; gap:10px; }
                .worldnew-price-pill { min-width:42px; border-radius:999px; background:#050505; color:#fff !important; padding:8px 12px; text-align:center; font-weight:700; font-size:0; text-decoration:none !important; line-height:1; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; }
                .worldnew-price-pill svg { width:18px; height:18px; display:block; fill:currentColor; }
                .worldnew-price-pill:hover { color:#fff !important; text-decoration:none !important; filter:brightness(.95); }
                .worldnew-track-play { width:44px; height:44px; border:0 !important; border-radius:999px; background:#ffeff8 !important; color:#F839A9 !important; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; transition:background .18s ease, color .18s ease, transform .18s ease; }
                .worldnew-track-play:hover, .worldnew-track-play:focus { background:#ffe2f3 !important; color:#F839A9 !important; transform:translateY(-1px); outline:2px solid rgba(248,57,169,.22); outline-offset:3px; }
                .worldnew-track-play.is-playing { background:#F839A9 !important; color:#fff !important; }
                .worldnew-track-play svg { width:20px; height:20px; display:block; fill:currentColor; }
                .worldnew-track-play .worldnew-pause-icon { display:none; }
                .worldnew-track-play.is-playing .worldnew-play-icon { display:none; }
                .worldnew-track-play.is-playing .worldnew-pause-icon { display:block; }
                .worldnew-track-time { color:#111827; font-size:17px; font-weight:700; min-width:48px; font-variant-numeric:tabular-nums; }
                .worldnew-audio-el { display:none; }
                @media (max-width:760px) {
                    .worldnew-music-player-shell { padding:14px; }
                    .worldnew-music-player-head { align-items:flex-start; gap:8px; }
                    .worldnew-artist-lockup { gap:10px; align-items:center; min-width:0; }
                    .worldnew-artist-photo { width:84px; height:84px; border-radius:14px!important; }
                    .worldnew-artist-lockup h3 { font-size:29px; letter-spacing:-.05em; }
                    .worldnew-artist-lockup p { font-size:14px; margin:6px 0 8px; }
                    .worldnew-ui-pill--follow { min-height:28px; padding:7px 13px; font-size:14px; border-radius:9px; }
                    .worldnew-wordmark { width:112px; max-width:31vw; }
                    .worldnew-preview-rail { gap:14px; margin:20px 0 8px; }
                    .worldnew-track-row { grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:15px 0; }
                    .worldnew-track-main { grid-template-columns:12px 18px minmax(0,1fr); gap:7px; }
                    .worldnew-drop svg { width:10px; height:10px; }
                    .worldnew-track-number { font-size:14px; }
                    .worldnew-track-copy strong { font-size:14px; line-height:1.2; }
                    .worldnew-track-copy small { font-size:12px; }
                    .worldnew-track-actions { gap:6px; justify-content:flex-end; }
                    .worldnew-price-pill { min-width:38px; padding:8px 10px; }
                    .worldnew-price-pill svg { width:16px; height:16px; }
                    .worldnew-track-play { width:38px; height:38px; }
                    .worldnew-track-play svg { width:17px; height:17px; }
                    .worldnew-track-time { min-width:42px; font-size:15px; }
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
                    var previewStart = 0;
                    var previewEnd = 30;
                    var timer = null;

                    function formatTime(seconds) {
                        var safeSeconds = Math.max(0, parseInt(seconds, 10) || 0);
                        var minutes = Math.floor(safeSeconds / 60);
                        var remainder = safeSeconds % 60;

                        return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
                    }

                    function resetActiveTime() {
                        if (activeTime) {
                            activeTime.textContent = activeTime.getAttribute('data-worldnew-initial-time') || formatTime(previewEnd - previewStart);
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
                            audio.currentTime = previewStart;
                        } catch (error) {}
                        clearPlayingState(resetTimerText);
                    }

                    function updateCountdown() {
                        if (!activeTime) return;

                        var remaining = Math.max(0, Math.ceil(previewEnd - audio.currentTime));
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
                            var nextStart = parseInt(btn.getAttribute('data-worldnew-preview-start-seconds') || '0', 10);
                            var nextEnd = parseInt(btn.getAttribute('data-worldnew-preview-end-seconds') || '0', 10);
                            if (!src) return;

                            if (activeBtn === btn && !audio.paused) {
                                stopPreview(true);
                                return;
                            }

                            stopPreview(true);
                            var limitSeconds = isNaN(nextLimit) ? 30 : Math.max(5, nextLimit);
                            previewStart = isNaN(nextStart) ? 0 : Math.max(0, nextStart);
                            previewEnd = !isNaN(nextEnd) && nextEnd > previewStart ? nextEnd : previewStart + limitSeconds;
                            activeBtn = btn;
                            activeTime = btn.closest('.worldnew-track-row').querySelector('.worldnew-track-time');
                            audio.src = src;
                            audio.currentTime = previewStart;
                            btn.classList.add('is-playing');
                            if (activeTime) {
                                activeTime.textContent = formatTime(previewEnd - previewStart);
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
            $target = strtolower((string) $request->get_param('target'));
            if (! in_array($target, array('website', 'community'), true)) {
                $target = 'community';
            }
            $tracks = $this->get_music_tracks(array(
                'featured_only' => $featured_only,
                'limit'         => $limit > 0 ? min($limit, 250) : 120,
                'target'        => $target,
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
