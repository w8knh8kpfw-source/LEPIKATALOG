import SwiftUI

// MARK: - App

@main
struct LEPIApp: App {
    @StateObject private var store = LEPIStore()

    var body: some Scene {
        WindowGroup {
            LEPIRootView()
                .environmentObject(store)
                .preferredColorScheme(.light)
                .task { await store.refreshStatuses() }
        }
    }
}

// MARK: - Design system

enum LEPIStyle {
    static let ink = Color(red: 0.12, green: 0.13, blue: 0.13)
    static let secondary = Color(red: 0.43, green: 0.44, blue: 0.43)
    static let paper = Color(red: 0.975, green: 0.973, blue: 0.963)
    static let card = Color.white
    static let line = Color(red: 0.90, green: 0.90, blue: 0.88)
    static let silver = Color(red: 0.78, green: 0.79, blue: 0.78)
    static let olive = Color(red: 0.39, green: 0.45, blue: 0.35)
    static let warning = Color(red: 0.68, green: 0.43, blue: 0.18)
    static let unavailable = Color(red: 0.68, green: 0.29, blue: 0.27)
}

extension View {
    func lepiCard() -> some View {
        self.background(LEPIStyle.card).clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(LEPIStyle.line, lineWidth: 0.8))
    }
}

// MARK: - Models

struct LEPIProduct: Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let unitPrice: Double
    let minimum: Int
    let unit: String
    let badge: String
    let description: String
    let imageName: String

    var imageURL: URL? {
        URL(string: "https://raw.githubusercontent.com/w8knh8kpfw-source/LEPIKATALOG/main/images/\(imageName)")
    }

    func price(for quantity: Int) -> Double {
        switch id {
        case "classic": return Double(quantity / 10 * 60 + quantity % 10 * 6)
        case "beef": return Double(quantity / 10 * 100 + quantity % 10 * 10)
        case "chopped": return quantity == 8 ? 60 : 60 + Double(quantity - 8) * 7.5
        default: return Double(quantity) * unitPrice
        }
    }

    static let all: [LEPIProduct] = [
        .init(id:"chicken",name:"Куриные котлеты с овощами",category:"Котлеты",unitPrice:7,minimum:10,unit:"10 штук",badge:"Хит продаж",description:"Домашние куриные котлеты с овощами. Минимальный заказ — 10 штук.",imageName:"cutlets-chicken-veg.jpg"),
        .init(id:"classic",name:"Сырники классические",category:"Сырники",unitPrice:6,minimum:10,unit:"10 штук",badge:"Классика",description:"Нежные домашние сырники из творога. 6 сомони за штуку.",imageName:"syrniki-classic.jpg"),
        .init(id:"choco",name:"Сырники шоколадные",category:"Сырники",unitPrice:7,minimum:10,unit:"10 штук",badge:"Популярное",description:"Сырники с молочным шоколадом. Минимальный заказ — 10 штук.",imageName:"syrniki-chocolate.jpg"),
        .init(id:"rafaello",name:"Сырники «Рафаэлло»",category:"Сырники",unitPrice:7,minimum:10,unit:"10 штук",badge:"Десерт",description:"Творожные сырники с белым шоколадом и кокосом.",imageName:"syrniki-rafaello.jpg"),
        .init(id:"varenko",name:"Сырники с варёнкой",category:"Сырники",unitPrice:7,minimum:10,unit:"10 штук",badge:"Новинка",description:"Сырники с начинкой из варёной сгущёнки.",imageName:"syrniki-varenka.jpg"),
        .init(id:"beef",name:"Говяжьи котлеты",category:"Котлеты",unitPrice:10,minimum:10,unit:"10 штук",badge:"Говядина",description:"Домашние котлеты из говядины. 10 сомони за штуку.",imageName:"cutlets-beef.jpg"),
        .init(id:"meatp",name:"Блинчики с мясом",category:"Блинчики",unitPrice:9,minimum:10,unit:"10 штук",badge:"Хит продаж",description:"Тонкие блинчики с мясной начинкой.",imageName:"crepes-meat.jpg"),
        .init(id:"curdp",name:"Блинчики с творогом",category:"Блинчики",unitPrice:6,minimum:10,unit:"10 штук",badge:"Любимый вкус",description:"Домашние блинчики с нежной творожной начинкой.",imageName:"crepes-curd.jpg"),
        .init(id:"condensed",name:"Блинчики с варёной сгущёнкой",category:"Блинчики",unitPrice:6,minimum:10,unit:"10 штук",badge:"Новинка",description:"Сладкие блинчики с варёной сгущёнкой.",imageName:"crepes-condensed.jpg"),
        .init(id:"apple",name:"Блинчики с яблоком и корицей",category:"Блинчики",unitPrice:7,minimum:10,unit:"10 штук",badge:"Хит сезона",description:"Ароматные блинчики с яблоком и корицей.",imageName:"crepes-apple.jpg"),
        .init(id:"chopped",name:"Рубленые куриные котлеты",category:"Котлеты",unitPrice:7.5,minimum:8,unit:"8 штук",badge:"Минимум 8 штук",description:"Рубленые котлеты с курицей и сыром. Минимальный заказ — 8 штук за 60 сомони.",imageName:"cutlets-chopped-chicken.jpg"),
        .init(id:"meatballs",name:"Фрикадельки",category:"Фрикадельки",unitPrice:25,minimum:1,unit:"пачка · 250 г",badge:"250 г",description:"Домашние фрикадельки. Одна пачка весом 250 г.",imageName:"meatballs.jpg")
    ]
}

enum StockStatus: String, Codable {
    case available, preorder, unavailable

    var title: String {
        switch self {
        case .available: return "В наличии"
        case .preorder: return "Предзаказ"
        case .unavailable: return "Нет в наличии"
        }
    }

    var tint: Color {
        switch self {
        case .available: return LEPIStyle.olive
        case .preorder: return LEPIStyle.warning
        case .unavailable: return LEPIStyle.unavailable
        }
    }
}

struct OrderLine: Encodable {
    let id: String
    let quantity: Int
}

struct OrderPayload: Encodable {
    let name: String
    let phone: String
    let address: String
    let comment: String
    let items: [OrderLine]
}

struct OrderResponse: Decodable {
    let success: Bool?
    let error: String?
    let tracking: TrackingInfo?
}

struct TrackingInfo: Decodable {
    let orderNumber: String?
    let url: String?
}

// MARK: - Store and networking

@MainActor
final class LEPIStore: ObservableObject {
    @Published private(set) var cart: [String: Int] = [:]
    @Published private(set) var statuses: [String: StockStatus] = [:]
    @Published var isLoadingStatuses = false
    @Published var lastOrderNumber: String?

    private let cartKey = "lepi.ios.cart.v1"
    private let apiBase = URL(string: "https://lepi-orders.onrender.com")!

    init() {
        if let data = UserDefaults.standard.data(forKey: cartKey),
           let saved = try? JSONDecoder().decode([String: Int].self, from: data) {
            cart = saved.filter { key, value in
                LEPIProduct.all.contains(where: { $0.id == key }) && value > 0 && value <= 200
            }
        }
    }

    var cartCount: Int { cart.values.reduce(0, +) }
    var cartProducts: [(product: LEPIProduct, quantity: Int)] {
        LEPIProduct.all.compactMap { product in
            guard let quantity = cart[product.id] else { return nil }
            return (product, quantity)
        }
    }
    var cartTotal: Double {
        cartProducts.reduce(0) { $0 + $1.product.price(for: $1.quantity) }
    }

    func status(for product: LEPIProduct) -> StockStatus { statuses[product.id] ?? .available }

    func add(_ product: LEPIProduct) {
        guard status(for: product) != .unavailable else { return }
        cart[product.id] = max(product.minimum, (cart[product.id] ?? 0) + (cart[product.id] == nil ? 0 : 1))
        persistCart()
    }

    func increment(_ product: LEPIProduct) {
        guard status(for: product) != .unavailable else { return }
        cart[product.id] = min(200, (cart[product.id] ?? product.minimum) + 1)
        persistCart()
    }

    func decrement(_ product: LEPIProduct) {
        let current = cart[product.id] ?? 0
        guard current > product.minimum else { return }
        cart[product.id] = current - 1
        persistCart()
    }

    func remove(_ product: LEPIProduct) {
        cart.removeValue(forKey: product.id)
        persistCart()
    }

    func clearCart() {
        cart.removeAll()
        persistCart()
    }

    private func persistCart() {
        if let data = try? JSONEncoder().encode(cart) {
            UserDefaults.standard.set(data, forKey: cartKey)
        }
    }

    func refreshStatuses() async {
        isLoadingStatuses = true
        defer { isLoadingStatuses = false }
        do {
            let url = apiBase.appendingPathComponent("api/product-statuses")
            var request = URLRequest(url: url)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.timeoutInterval = 15
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return }
            struct StatusEnvelope: Decodable { let statuses: [String: StockStatus] }
            let decoded = try JSONDecoder().decode(StatusEnvelope.self, from: data)
            statuses = decoded.statuses
        } catch {
            // Keep the storefront usable with the last known/default status.
        }
    }

    func submitOrder(name: String, phone: String, address: String, comment: String) async throws -> String? {
        let url = apiBase.appendingPathComponent("api/order")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 35
        let payload = OrderPayload(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            address: address.trimmingCharacters(in: .whitespacesAndNewlines),
            comment: comment.trimmingCharacters(in: .whitespacesAndNewlines),
            items: cartProducts.map { OrderLine(id: $0.product.id, quantity: $0.quantity) }
        )
        request.httpBody = try JSONEncoder().encode(payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw LEPIError.server }
        let result = try? JSONDecoder().decode(OrderResponse.self, from: data)
        guard (200..<300).contains(http.statusCode), result?.success == true else {
            throw LEPIError.message(result?.error ?? "Не удалось отправить заказ. Попробуйте ещё раз.")
        }
        let number = result?.tracking?.orderNumber
        lastOrderNumber = number
        clearCart()
        return number
    }
}

enum LEPIError: LocalizedError {
    case server
    case message(String)
    var errorDescription: String? {
        switch self {
        case .server: return "Сервер временно недоступен. Попробуйте позже."
        case .message(let text): return text
        }
    }
}

// MARK: - Root navigation

enum LEPITab: String, CaseIterable {
    case home = "Главная"
    case catalog = "Каталог"
    case cart = "Корзина"

    var symbol: String {
        switch self {
        case .home: return "house"
        case .catalog: return "square.grid.2x2"
        case .cart: return "bag"
        }
    }
}

struct LEPIRootView: View {
    @EnvironmentObject private var store: LEPIStore
    @State private var tab: LEPITab = .home

    var body: some View {
        TabView(selection: $tab) {
            HomeView { tab = .catalog }
                .tabItem { Label("Главная", systemImage: "house") }
                .tag(LEPITab.home)
            CatalogView()
                .tabItem { Label("Каталог", systemImage: "square.grid.2x2") }
                .tag(LEPITab.catalog)
            CartView()
                .tabItem {
                    Label {
                        if store.cartCount > 0 { Text("Корзина · \(store.cartCount)") } else { Text("Корзина") }
                    } icon: { Image(systemName: "bag") }
                }
                .tag(LEPITab.cart)
        }
        .tint(LEPIStyle.ink)
    }
}

// MARK: - Home

struct HomeView: View {
    let openCatalog: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 26) {
                    HStack {
                        Text("LEPÍ").font(.system(size: 31, weight: .semibold, design: .serif)).tracking(-1.5)
                        Spacer()
                        Text("ХУДЖАНД").font(.system(size: 10, weight: .medium)).tracking(2).foregroundStyle(LEPIStyle.secondary)
                    }
                    ZStack(alignment: .bottomLeading) {
                        RoundedRectangle(cornerRadius: 28).fill(Color(red:0.91,green:0.90,blue:0.86))
                        AsyncImage(url: URL(string:"https://raw.githubusercontent.com/w8knh8kpfw-source/LEPIKATALOG/main/images/hero-bags.jpg")) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            LinearGradient(colors:[Color(red:0.93,green:0.92,blue:0.88),.white],startPoint:.topLeading,endPoint:.bottomTrailing)
                        }
                        .frame(height: 300).clipped().clipShape(RoundedRectangle(cornerRadius:28))
                        LinearGradient(colors:[.clear,.black.opacity(0.48)],startPoint:.center,endPoint:.bottom)
                            .clipShape(RoundedRectangle(cornerRadius:28))
                        VStack(alignment:.leading,spacing:10) {
                            Text("ВКУС ДОМАШНЕГО УЮТА").font(.system(size:10,weight:.semibold)).tracking(2)
                            Text("Вкус, который\nсогревает.").font(.system(size:34,weight:.regular,design:.serif)).lineSpacing(-2)
                            Text("Любимые блюда, приготовленные с заботой.")
                                .font(.system(size:13)).opacity(0.9)
                        }.foregroundStyle(.white).padding(24)
                    }.frame(height:300)
                    VStack(alignment:.leading,spacing:14) {
                        sectionEyebrow("НАШЕ МЕНЮ")
                        Text("Что сегодня вкусного?").font(.system(size:27,weight:.regular,design:.serif)).foregroundStyle(LEPIStyle.ink)
                        Text("Домашние заготовки на завтрак, обед и к чаю.")
                            .font(.system(size:14)).foregroundStyle(LEPIStyle.secondary)
                        Button(action:openCatalog) {
                            HStack { Text("Открыть каталог"); Spacer(); Image(systemName:"arrow.right") }
                                .font(.system(size:14,weight:.medium)).foregroundStyle(.white)
                                .padding(18).background(LEPIStyle.ink).clipShape(Capsule())
                        }
                    }
                    HStack(spacing:12) {
                        benefitCard("heart","С заботой","Домашний подход")
                        benefitCard("snowflake","Удобно хранить","Заготовки на каждый день")
                    }
                    VStack(alignment:.leading,spacing:10) {
                        sectionEyebrow("LEPÍ · ХУДЖАНД")
                        Text("Просто. Вкусно. По-домашнему.")
                            .font(.system(size:24,weight:.regular,design:.serif))
                        Text("Выберите блюда в каталоге, добавьте их в корзину и отправьте заказ. Мы свяжемся с вами, чтобы подтвердить детали.")
                            .font(.system(size:14)).foregroundStyle(LEPIStyle.secondary).lineSpacing(4)
                    }
                }.padding(.horizontal,22).padding(.top,14).padding(.bottom,32)
            }
            .background(LEPIStyle.paper.ignoresSafeArea())
            .toolbar(.hidden,for:.navigationBar)
        }
    }

    private func benefitCard(_ icon:String,_ title:String,_ subtitle:String)->some View {
        VStack(alignment:.leading,spacing:8) {
            Image(systemName:icon).font(.system(size:17)).foregroundStyle(LEPIStyle.olive)
            Text(title).font(.system(size:14,weight:.medium))
            Text(subtitle).font(.system(size:11)).foregroundStyle(LEPIStyle.secondary)
        }.frame(maxWidth:.infinity,alignment:.leading).padding(16).lepiCard()
    }
}

// MARK: - Catalog

struct CatalogView: View {
    @EnvironmentObject private var store: LEPIStore
    @State private var category = "Все"
    @State private var search = ""
    @State private var selected: LEPIProduct?

    private let categories = ["Все","Блинчики","Сырники","Котлеты","Фрикадельки"]
    private var filtered: [LEPIProduct] {
        LEPIProduct.all.filter {
            (category == "Все" || $0.category == category) &&
            (search.isEmpty || $0.name.localizedCaseInsensitiveContains(search))
        }
    }
    private let columns = [GridItem(.adaptive(minimum: 230),spacing:14)]

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators:false) {
                VStack(alignment:.leading,spacing:18) {
                    VStack(alignment:.leading,spacing:6) {
                        sectionEyebrow("LEPÍ · ДОМАШНЯЯ КУХНЯ")
                        Text("Каталог").font(.system(size:34,weight:.regular,design:.serif))
                        Text("Выберите то, что сегодня хочется поставить на стол.")
                            .font(.system(size:13)).foregroundStyle(LEPIStyle.secondary)
                    }
                    HStack(spacing:10) {
                        Image(systemName:"magnifyingglass").foregroundStyle(LEPIStyle.secondary)
                        TextField("Найти любимое блюдо",text:$search)
                            .font(.system(size:14)).autocorrectionDisabled()
                    }.padding(14).background(.white).clipShape(Capsule()).overlay(Capsule().stroke(LEPIStyle.line))
                    ScrollView(.horizontal,showsIndicators:false) {
                        HStack(spacing:8) {
                            ForEach(categories,id:\.self) { item in
                                Button { category = item } label: {
                                    Text(item).font(.system(size:12,weight:.medium))
                                        .padding(.horizontal,16).padding(.vertical,10)
                                        .background(category == item ? LEPIStyle.ink : .white)
                                        .foregroundStyle(category == item ? .white : LEPIStyle.ink)
                                        .clipShape(Capsule())
                                        .overlay(Capsule().stroke(category == item ? LEPIStyle.ink : LEPIStyle.line))
                                }.buttonStyle(.plain)
                            }
                        }
                    }
                    LazyVGrid(columns:columns,spacing:16) {
                        ForEach(filtered) { product in
                            ProductCard(product:product)
                                .contentShape(Rectangle())
                                .onTapGesture { selected = product }
                                .environmentObject(store)
                        }
                    }
                    if filtered.isEmpty {
                        ContentUnavailableView.search(text:search)
                    }
                }.padding(.horizontal,18).padding(.top,16).padding(.bottom,28)
            }
            .background(LEPIStyle.paper.ignoresSafeArea())
            .toolbar(.hidden,for:.navigationBar)
            .sheet(item:$selected) { product in ProductDetailView(product:product).environmentObject(store) }
            .refreshable { await store.refreshStatuses() }
        }
    }
}

struct ProductCard: View {
    @EnvironmentObject private var store: LEPIStore
    let product: LEPIProduct

    var body: some View {
        VStack(alignment:.leading,spacing:0) {
            ZStack(alignment:.topLeading) {
                ProductImage(product:product).frame(height:170).clipped()
                Text(product.badge.uppercased()).font(.system(size:8,weight:.semibold)).tracking(1)
                    .padding(.horizontal,10).padding(.vertical,7).background(.white.opacity(0.92)).clipShape(Capsule()).padding(10)
            }
            VStack(alignment:.leading,spacing:8) {
                Text(product.name).font(.system(size:15,weight:.medium)).foregroundStyle(LEPIStyle.ink).lineLimit(2).frame(height:40,alignment:.topLeading)
                StockPill(status:store.status(for:product))
                HStack(alignment:.firstTextBaseline) {
                    Text(priceText(product)).font(.system(size:16,weight:.semibold)).foregroundStyle(LEPIStyle.ink)
                    Spacer(minLength:4)
                    Button {
                        store.add(product)
                    } label: {
                        Image(systemName:store.cart[product.id] == nil ? "plus" : "checkmark")
                            .font(.system(size:13,weight:.semibold)).foregroundStyle(.white)
                            .frame(width:34,height:34).background(store.status(for:product) == .unavailable ? LEPIStyle.silver : LEPIStyle.ink).clipShape(Circle())
                    }.disabled(store.status(for:product) == .unavailable)
                }
            }.padding(13)
        }.background(.white).clipShape(RoundedRectangle(cornerRadius:20)).overlay(RoundedRectangle(cornerRadius:20).stroke(LEPIStyle.line,lineWidth:0.8))
    }
}

struct ProductImage: View {
    let product: LEPIProduct
    var body: some View {
        AsyncImage(url:product.imageURL) { phase in
            switch phase {
            case .success(let image): image.resizable().scaledToFill()
            case .failure: imageFallback
            case .empty: ZStack { LEPIStyle.paper; ProgressView().tint(LEPIStyle.silver) }
            @unknown default: imageFallback
            }
        }
    }
    private var imageFallback: some View {
        ZStack { LEPIStyle.paper; Image(systemName:"fork.knife").font(.system(size:25)).foregroundStyle(LEPIStyle.silver) }
    }
}

struct StockPill: View {
    let status: StockStatus
    var body: some View {
        HStack(spacing:5) {
            Circle().fill(status.tint).frame(width:5,height:5)
            Text(status.title).font(.system(size:10,weight:.medium)).foregroundStyle(status.tint)
        }.padding(.horizontal,9).padding(.vertical,6).background(status.tint.opacity(0.09)).clipShape(Capsule())
    }
}

struct ProductDetailView: View {
    @EnvironmentObject private var store: LEPIStore
    @Environment(\.dismiss) private var dismiss
    let product: LEPIProduct

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    ProductImage(product:product).frame(height:280).clipShape(RoundedRectangle(cornerRadius:24))
                    sectionEyebrow(product.category.uppercased())
                    Text(product.name).font(.system(size:30,weight:.regular,design:.serif))
                    StockPill(status:store.status(for:product))
                    Text(product.description).font(.system(size:15)).foregroundStyle(LEPIStyle.secondary).lineSpacing(4)
                    HStack {
                        Text(priceText(product)).font(.system(size:21,weight:.semibold))
                        Spacer()
                        Text("Минимум: \(product.minimum) шт.").font(.system(size:11)).foregroundStyle(LEPIStyle.secondary)
                    }
                    Text("Состав и подробности можно уточнить у команды LEPÍ перед заказом.")
                        .font(.system(size:12)).foregroundStyle(LEPIStyle.secondary)
                    Button {
                        store.add(product)
                        dismiss()
                    } label: {
                        Text(store.status(for:product) == .unavailable ? "Временно недоступно" : "Добавить в корзину")
                            .font(.system(size:14,weight:.medium)).frame(maxWidth:.infinity).padding(17)
                            .background(store.status(for:product) == .unavailable ? LEPIStyle.silver : LEPIStyle.ink)
                            .foregroundStyle(.white).clipShape(Capsule())
                    }.disabled(store.status(for:product) == .unavailable)
                }.padding(20)
            }.background(LEPIStyle.paper.ignoresSafeArea())
                .toolbar { ToolbarItem(placement:.topBarTrailing) { Button("Готово") { dismiss() }.tint(LEPIStyle.ink) } }
        }
    }
}

// MARK: - Cart

struct CartView: View {
    @EnvironmentObject private var store: LEPIStore
    @State private var showCheckout = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    VStack(alignment:.leading,spacing:5) {
                        sectionEyebrow("ВАШ ВЫБОР")
                        Text("Корзина").font(.system(size:34,weight:.regular,design:.serif))
                    }
                    if store.cartProducts.isEmpty {
                        VStack(spacing:14) {
                            Image(systemName:"bag").font(.system(size:34,weight:.ultraLight)).foregroundStyle(LEPIStyle.silver)
                            Text("Пока здесь пусто").font(.system(size:20,weight:.regular,design:.serif))
                            Text("Добавьте любимые блюда из каталога.")
                                .font(.system(size:13)).foregroundStyle(LEPIStyle.secondary)
                        }.frame(maxWidth:.infinity).padding(.vertical,70).lepiCard()
                    } else {
                        ForEach(store.cartProducts,id:\.product.id) { item in
                            CartLine(product:item.product,quantity:item.quantity)
                        }
                        VStack(spacing:12) {
                            HStack {
                                Text("Итого")
                                Spacer()
                                Text(money(store.cartTotal)).font(.system(size:21,weight:.semibold))
                            }
                            Text("Стоимость доставки уточняется при подтверждении заказа.")
                                .font(.system(size:11)).foregroundStyle(LEPIStyle.secondary).frame(maxWidth:.infinity,alignment:.leading)
                            Button { showCheckout = true } label: {
                                HStack { Text("Перейти к оформлению"); Spacer(); Image(systemName:"arrow.right") }
                                    .font(.system(size:14,weight:.medium)).foregroundStyle(.white).padding(18)
                                    .background(LEPIStyle.ink).clipShape(Capsule())
                            }
                        }.padding(18).lepiCard()
                    }
                }.padding(18)
            }.background(LEPIStyle.paper.ignoresSafeArea())
                .toolbar(.hidden,for:.navigationBar)
                .sheet(isPresented:$showCheckout) { CheckoutView().environmentObject(store) }
        }
    }
}

struct CartLine: View {
    @EnvironmentObject private var store: LEPIStore
    let product: LEPIProduct
    let quantity: Int

    var body: some View {
        HStack(spacing:13) {
            ProductImage(product:product).frame(width:88,height:88).clipShape(RoundedRectangle(cornerRadius:15))
            VStack(alignment:.leading,spacing:7) {
                Text(product.name).font(.system(size:14,weight:.medium)).lineLimit(2)
                Text(money(product.price(for:quantity))).font(.system(size:13,weight:.semibold))
                HStack(spacing:13) {
                    Button { store.decrement(product) } label: { Image(systemName:"minus").frame(width:27,height:27) }
                        .disabled(quantity <= product.minimum)
                    Text("\(quantity)").font(.system(size:12,weight:.medium).monospacedDigit())
                    Button { store.increment(product) } label: { Image(systemName:"plus").frame(width:27,height:27) }
                    Spacer()
                    Button(role:.destructive) { store.remove(product) } label: { Image(systemName:"trash").font(.system(size:12)) }
                }.buttonStyle(.plain).foregroundStyle(LEPIStyle.ink)
            }
        }.padding(12).lepiCard()
    }
}

// MARK: - Checkout

struct CheckoutView: View {
    @EnvironmentObject private var store: LEPIStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = "+992 "
    @State private var address = ""
    @State private var comment = ""
    @State private var privacyAccepted = false
    @State private var sending = false
    @State private var errorText: String?
    @State private var successNumber: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    if let successNumber {
                        VStack(spacing:14) {
                            Image(systemName:"checkmark.circle.fill").font(.system(size:48)).foregroundStyle(LEPIStyle.olive)
                            Text("Заказ отправлен").font(.system(size:28,weight:.regular,design:.serif))
                            Text("Спасибо! Команда LEPÍ свяжется с вами для подтверждения деталей.")
                                .font(.system(size:14)).foregroundStyle(LEPIStyle.secondary).multilineTextAlignment(.center)
                            if !successNumber.isEmpty { Text(successNumber).font(.system(size:13,weight:.semibold)).padding(12).background(LEPIStyle.paper).clipShape(Capsule()) }
                            Button("Готово") { dismiss() }.font(.system(size:14,weight:.medium)).frame(maxWidth:.infinity).padding(17).background(LEPIStyle.ink).foregroundStyle(.white).clipShape(Capsule())
                        }.frame(maxWidth:.infinity).padding(.vertical,40)
                    } else {
                        sectionEyebrow("ПОСЛЕДНИЙ ШАГ")
                        Text("Оформление заказа").font(.system(size:30,weight:.regular,design:.serif))
                        Text("Оставьте контакты, и мы свяжемся с вами.")
                            .font(.system(size:13)).foregroundStyle(LEPIStyle.secondary)
                        formField("Ваше имя",placeholder:"Имя",text:$name)
                        formField("Телефон",placeholder:"+992",text:$phone).keyboardType(.phonePad)
                        formField("Адрес доставки",placeholder:"Город, улица, дом",text:$address)
                        VStack(alignment:.leading,spacing:7) {
                            Text("Комментарий · необязательно").font(.system(size:12,weight:.medium))
                            TextField("Пожелания к заказу",text:$comment,axis:.vertical).lineLimit(3...5)
                                .padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius:14)).overlay(RoundedRectangle(cornerRadius:14).stroke(LEPIStyle.line))
                        }
                        Toggle(isOn:$privacyAccepted) {
                            Text("Я согласен(на) с политикой конфиденциальности.")
                                .font(.system(size:12)).foregroundStyle(LEPIStyle.secondary)
                        }.tint(LEPIStyle.olive)
                        if let errorText {
                            Text(errorText).font(.system(size:12)).foregroundStyle(LEPIStyle.unavailable)
                        }
                        HStack {
                            Text("К оплате")
                            Spacer()
                            Text(money(store.cartTotal)).font(.system(size:20,weight:.semibold))
                        }.padding(.vertical,8)
                        Button {
                            Task { await send() }
                        } label: {
                            HStack {
                                if sending { ProgressView().tint(.white) }
                                Text(sending ? "Отправляем…" : "Отправить заказ")
                                Spacer()
                                Image(systemName:"arrow.right")
                            }.font(.system(size:14,weight:.medium)).foregroundStyle(.white).padding(18)
                                .background(canSubmit ? LEPIStyle.ink : LEPIStyle.silver).clipShape(Capsule())
                        }.disabled(!canSubmit)
                        Text("Доставка и окончательные детали подтверждаются менеджером LEPÍ.")
                            .font(.system(size:11)).foregroundStyle(LEPIStyle.secondary)
                    }
                }.padding(22)
            }.background(LEPIStyle.paper.ignoresSafeArea())
                .toolbar { ToolbarItem(placement:.topBarTrailing) { Button("Закрыть") { dismiss() }.tint(LEPIStyle.ink) } }
        }
    }

    private var canSubmit: Bool {
        !sending && privacyAccepted && name.trimmingCharacters(in:.whitespaces).count >= 2 &&
        phone.filter(\.isNumber).count >= 7 && address.trimmingCharacters(in:.whitespaces).count >= 5 &&
        !store.cart.isEmpty
    }

    private func send() async {
        guard canSubmit else { return }
        sending = true
        errorText = nil
        defer { sending = false }
        do {
            let number = try await store.submitOrder(name:name,phone:phone,address:address,comment:comment)
            successNumber = number ?? "Заказ принят"
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func formField(_ title:String,placeholder:String,text:Binding<String>)->some View {
        VStack(alignment:.leading,spacing:7) {
            Text(title).font(.system(size:12,weight:.medium))
            TextField(placeholder,text:text).padding(14).background(.white)
                .clipShape(RoundedRectangle(cornerRadius:14))
                .overlay(RoundedRectangle(cornerRadius:14).stroke(LEPIStyle.line))
        }
    }
}

// MARK: - Shared helpers

func sectionEyebrow(_ text:String)->some View {
    Text(text).font(.system(size:9,weight:.semibold)).tracking(2).foregroundStyle(LEPIStyle.secondary)
}

func money(_ value:Double)->String {
    let formatted = value.rounded() == value ? String(Int(value)) : String(format:"%.2f",value)
    return formatted + " сомони"
}

func priceText(_ product:LEPIProduct)->String {
    if product.id == "meatballs" { return "25 сомони" }
    if product.id == "chopped" { return "60 сомони" }
    if product.id == "classic" { return "6 сомони / шт." }
    if product.id == "beef" { return "10 сомони / шт." }
    return money(product.price(for:product.minimum))
}
