package com.lepi.android

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

private val Milk = Color(0xFFF7F6F0)
private val Leaf = Color(0xFF63785B)
private val Forest = Color(0xFF344B38)
private val Charcoal = Color(0xFF27332B)
private val Fog = Color(0xFF899187)
private val GlassWhite = Color(0xDFFFFFFF)
private val GlassLine = Color(0xBFFFFFFF)
private const val IMAGE_ROOT = "https://raw.githubusercontent.com/w8knh8kpfw-source/LEPIKATALOG/main/images/"

private data class Dish(
    val id: String,
    val title: String,
    val category: String,
    val price: Double,
    val minQty: Int,
    val unit: String,
    val image: String,
    val note: String
)

private val menu = listOf(
    Dish("classic", "Сырники классические", "Сырники", 6.0, 10, "за штуку", "syrniki-classic.jpg", "Нежные сырники для уютного завтрака."),
    Dish("rafaello", "Сырники «Рафаэлло»", "Сырники", 7.0, 10, "за штуку", "syrniki-rafaello.jpg", "С белым шоколадом и кокосовой стружкой."),
    Dish("varenko", "Сырники со сгущёнкой", "Сырники", 7.0, 10, "за штуку", "syrniki-varenka.jpg", "Сладкая начинка из сгущёнки."),
    Dish("chicken", "Куриные котлеты с овощами", "Котлеты", 7.0, 10, "за штуку", "cutlets-chicken-veg.jpg", "Домашние котлеты из курицы и овощей."),
    Dish("beef", "Говяжьи котлеты", "Котлеты", 10.0, 10, "за штуку", "cutlets-beef.jpg", "Сытные котлеты из говядины."),
    Dish("chopped", "Рубленые куриные котлеты с сыром", "Котлеты", 7.5, 8, "за штуку", "cutlets-chopped-chicken.jpg", "Куриное филе, сыр и зелень."),
    Dish("meatballs", "Фрикадельки", "Фрикадельки", 25.0, 1, "250 г", "meatballs.jpg", "Удобная порция для домашнего обеда."),
    Dish("meatp", "Блинчики с мясом", "Блинчики", 9.0, 10, "за штуку", "crepes-meat.jpg", "Тонкие блинчики с мясной начинкой."),
    Dish("curdp", "Блинчики с творогом", "Блинчики", 6.0, 10, "за штуку", "crepes-curd.jpg", "Нежная творожная начинка."),
    Dish("condensed", "Блинчики со сгущёнкой", "Блинчики", 5.0, 10, "за штуку", "crepes-condensed.jpg", "Сладкий вариант к чаю.")
)

private enum class Page(val label: String, val icon: ImageVector) {
    HOME("Главная", Icons.Default.Home),
    MENU("Каталог", Icons.Default.GridView),
    CART("Корзина", Icons.Default.ShoppingBag),
    ABOUT("О нас", Icons.Default.Info)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { LepiGlassApp(this) }
    }
}

@Composable
private fun LepiGlassApp(context: Context) {
    var welcome by remember { mutableStateOf(true) }
    var page by remember { mutableStateOf(Page.HOME) }
    var selected by remember { mutableStateOf<Dish?>(null) }
    var checkout by remember { mutableStateOf(false) }
    var sending by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val cart = remember { mutableStateMapOf<String, Int>().apply { putAll(readCart(context)) } }
    val scope = rememberCoroutineScope()
    val quantity = cart.values.sum()

    LaunchedEffect(cart.toMap()) { writeCart(context, cart.toMap()) }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Leaf, secondary = Forest, background = Milk,
            surface = Color.White, onSurface = Charcoal
        )
    ) {
        Box(Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Color(0xFFF9F8F2), Color(0xFFECEFE5), Color(0xFFF5F4EE)))
        )) {
            AnimatedContent(targetState = welcome, label = "welcome-transition") { isWelcome ->
                if (isWelcome) WelcomeScreen { welcome = false }
                else MainShell(page, quantity, { page = it }, cart,
                    onDish = { selected = it },
                    onAdd = { dish -> cart[dish.id] = (cart[dish.id] ?: 0).let { if (it == 0) dish.minQty else it + 1 } },
                    onPlus = { id -> cart[id] = minOf((cart[id] ?: 0) + 1, 200) },
                    onMinus = { id ->
                        val count = cart[id] ?: 0
                        val dish = menu.firstOrNull { it.id == id }
                        if (dish == null || count <= dish.minQty) cart.remove(id) else cart[id] = count - 1
                    },
                    onRemove = { cart.remove(it) },
                    onCheckout = { checkout = true },
                    onAbout = { openInstagram(context) }
                )
            }
            selected?.let { dish ->
                DishSheet(dish, onClose = { selected = null }, onAdd = {
                    cart[dish.id] = (cart[dish.id] ?: 0).let { if (it == 0) dish.minQty else it + 1 }
                    selected = null
                    page = Page.CART
                })
            }
            if (checkout) CheckoutSheet(
                busy = sending,
                onClose = { if (!sending) checkout = false },
                onSubmit = { name, phone, address, note ->
                    sending = true
                    scope.launch {
                        try {
                            val result = sendOrder(name, phone, address, note, cart.toMap())
                            cart.clear()
                            checkout = false
                            message = if (result.isBlank()) "Мы скоро свяжемся с вами для подтверждения." else "Заказ принят. Номер: " + result
                        } catch (e: Exception) {
                            message = e.message ?: "Не удалось отправить заказ. Попробуйте ещё раз."
                        } finally { sending = false }
                    }
                }
            )
            message?.let { text ->
                AlertDialog(
                    onDismissRequest = { message = null },
                    containerColor = Color.White,
                    title = { Text("LEPÍ", fontFamily = FontFamily.Serif, color = Forest) },
                    text = { Text(text, color = Charcoal) },
                    confirmButton = { TextButton(onClick = { message = null }) { Text("Хорошо") } }
                )
            }
        }
    }
}

@Composable
private fun WelcomeScreen(onEnter: () -> Unit) {
    val transition = rememberInfiniteTransition(label = "welcome-float")
    val drift by transition.animateFloat(
        initialValue = -8f, targetValue = 8f,
        animationSpec = infiniteRepeatable(tween(3200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "drift"
    )
    val appear by animateFloatAsState(1f, animationSpec = tween(900), label = "appear")
    Box(Modifier.fillMaxSize().padding(22.dp), contentAlignment = Alignment.Center) {
        GlassPanel(Modifier.fillMaxWidth().offset(y = drift.dp).alpha(appear), radius = 36.dp) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 25.dp, vertical = 34.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(17.dp)
            ) {
                Box(
                    Modifier.size(82.dp).clip(CircleShape)
                        .background(Brush.linearGradient(listOf(Color(0xFFE6EDDE), Color.White, Color(0xFFC9D7BF)))),
                    contentAlignment = Alignment.Center
                ) {
                    Text("L", fontFamily = FontFamily.Serif, fontSize = 54.sp, color = Forest)
                }
                Text("LEPÍ", fontFamily = FontFamily.Serif, fontSize = 42.sp, letterSpacing = 7.sp, color = Forest)
                Text("ВКУС ДОМАШНЕГО УЮТА", fontSize = 10.sp, letterSpacing = 2.4.sp, color = Fog)
                Box(Modifier.fillMaxWidth().height(190.dp).clip(RoundedCornerShape(25.dp))) {
                    Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Color(0xFFE4EBDD), Color(0xFFF9F7EF), Color(0xFFD8E1D0)))))
                    AsyncImage(
                        model = IMAGE_ROOT + "hero-bags.jpg",
                        contentDescription = "Фирменная упаковка LEPÍ",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    Text("Домашнее,\nс любовью.", Modifier.align(Alignment.BottomStart).padding(17.dp),
                        color = Forest, fontFamily = FontFamily.Serif, fontSize = 29.sp, lineHeight = 31.sp)
                }
                Text("Любимые блюда и заготовки,\nкоторые делают каждый день уютнее.",
                    color = Fog, fontSize = 13.sp, lineHeight = 20.sp)
                GlassButton("Открыть LEPÍ", onEnter, Modifier.fillMaxWidth())
                Text("ХУДЖАНД · ТАДЖИКИСТАН", color = Fog, fontSize = 9.sp, letterSpacing = 1.8.sp)
            }
        }
    }
}

@Composable
private fun MainShell(
    page: Page,
    quantity: Int,
    onPage: (Page) -> Unit,
    cart: Map<String, Int>,
    onDish: (Dish) -> Unit,
    onAdd: (Dish) -> Unit,
    onPlus: (String) -> Unit,
    onMinus: (String) -> Unit,
    onRemove: (String) -> Unit,
    onCheckout: () -> Unit,
    onAbout: () -> Unit
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Row(
            Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("LEPÍ", fontFamily = FontFamily.Serif, fontSize = 27.sp, letterSpacing = 4.sp, color = Forest)
                Text("ДОМАШНИЙ ВКУС РЯДОМ", fontSize = 8.sp, letterSpacing = 1.5.sp, color = Fog)
            }
            GlassIconButton(Icons.Default.ShoppingBag, quantity, { onPage(Page.CART) })
        }
        Box(Modifier.weight(1f)) {
            Crossfade(targetState = page, animationSpec = tween(260), label = "page") { current ->
                when (current) {
                    Page.HOME -> HomePage(onPage, onDish)
                    Page.MENU -> MenuPage(onDish, onAdd)
                    Page.CART -> CartPage(cart, onPlus, onMinus, onRemove, onCheckout)
                    Page.ABOUT -> AboutPage(onAbout)
                }
            }
        }
        GlassPanel(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 10.dp), radius = 25.dp) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 5.dp, vertical = 7.dp),
                horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                Page.entries.forEach { item ->
                    val active = page == item
                    val scale by animateFloatAsState(if (active) 1.04f else 1f, label = "nav-scale")
                    Column(
                        Modifier.weight(1f).scale(scale).clip(RoundedCornerShape(18.dp))
                            .clickable { onPage(item) }.padding(vertical = 5.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(item.icon, contentDescription = item.label,
                            tint = if (active) Forest else Fog, modifier = Modifier.size(21.dp))
                        Spacer(Modifier.height(3.dp))
                        Text(item.label, color = if (active) Forest else Fog,
                            fontSize = 9.sp, fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal)
                    }
                }
            }
        }
    }
}

@Composable
private fun HomePage(onPage: (Page) -> Unit, onDish: (Dish) -> Unit) {
    val featured = menu.first { it.id == "rafaello" }
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(17.dp),
        contentPadding = PaddingValues(bottom = 18.dp)
    ) {
        item {
            GlassPanel(Modifier.fillMaxWidth(), radius = 29.dp) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("ПРИГОТОВЛЕНО С ЗАБОТОЙ", color = Leaf, fontSize = 9.sp, letterSpacing = 1.7.sp, fontWeight = FontWeight.Bold)
                    Text("Маленькие моменты.\nБольшой домашний уют.", color = Forest,
                        fontFamily = FontFamily.Serif, fontSize = 32.sp, lineHeight = 35.sp)
                    Text("Домашние полуфабрикаты, чтобы вкусная еда была ближе каждый день.",
                        color = Fog, fontSize = 12.sp, lineHeight = 18.sp)
                    GlassPhoto("hero-bags.jpg", "Фирменная упаковка LEPÍ", Modifier.fillMaxWidth().height(175.dp))
                    GlassButton("Смотреть каталог", { onPage(Page.MENU) }, Modifier.fillMaxWidth())
                }
            }
        }
        item { SectionTitle("ВЫБРАЛИ ДЛЯ ВАС", "Любимые вкусы") }
        item { FeaturedDish(featured, onDish) }
        item { SectionTitle("ВСЁ ДЛЯ УЮТНОГО СТОЛА", "Категории") }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CategoryCard("Сырники", "syrniki-classic.jpg", Modifier.weight(1f)) { onPage(Page.MENU) }
                CategoryCard("Котлеты", "cutlets-chicken-veg.jpg", Modifier.weight(1f)) { onPage(Page.MENU) }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CategoryCard("Блинчики", "crepes-meat.jpg", Modifier.weight(1f)) { onPage(Page.MENU) }
                CategoryCard("Фрикадельки", "meatballs.jpg", Modifier.weight(1f)) { onPage(Page.MENU) }
            }
        }
        item {
            GlassPanel(Modifier.fillMaxWidth(), radius = 22.dp) {
                Column(Modifier.padding(18.dp)) {
                    Text("LEPÍ", fontFamily = FontFamily.Serif, fontSize = 25.sp, color = Forest)
                    Text("Домашний вкус. Без лишней суеты.", color = Charcoal, fontSize = 13.sp)
                    Text("Худжанд · Доставка по городу", color = Fog, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun MenuPage(onDish: (Dish) -> Unit, onAdd: (Dish) -> Unit) {
    var filter by remember { mutableStateOf("Все") }
    var search by remember { mutableStateOf("") }
    val categories = listOf("Все", "Сырники", "Котлеты", "Блинчики", "Фрикадельки")
    val visible = menu.filter {
        (filter == "Все" || it.category == filter) && it.title.contains(search, ignoreCase = true)
    }
    Column {
        SectionTitle("МЕНЮ LEPÍ", "Каталог")
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = search, onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(), singleLine = true,
            placeholder = { Text("Найти блюдо", fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Default.Search, null, tint = Fog) },
            shape = RoundedCornerShape(18.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = GlassWhite, focusedContainerColor = Color.White,
                unfocusedBorderColor = GlassLine, focusedBorderColor = Leaf
            )
        )
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            categories.forEach { category ->
                FilterChip(
                    selected = filter == category, onClick = { filter = category },
                    label = { Text(category, fontSize = 11.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFFDDE7D6), selectedLabelColor = Forest
                    )
                )
            }
        }
        if (visible.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Ничего не найдено", color = Fog)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(148.dp),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(bottom = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(visible, key = { it.id }) { dish -> DishCard(dish, { onDish(dish) }, { onAdd(dish) }) }
            }
        }
    }
}

@Composable
private fun DishCard(dish: Dish, onOpen: () -> Unit, onAdd: () -> Unit) {
    GlassPanel(Modifier.fillMaxWidth().clickable(onClick = onOpen), radius = 22.dp) {
        Column {
            GlassPhoto(dish.image, dish.title, Modifier.fillMaxWidth().height(130.dp))
            Column(Modifier.padding(11.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(dish.category.uppercase(), color = Leaf, fontSize = 8.sp, letterSpacing = 1.1.sp)
                Text(dish.title, color = Charcoal, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                    minLines = 2, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(priceLabel(dish), color = Forest, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                GlassButton("Добавить", onAdd, Modifier.fillMaxWidth(), compact = true)
            }
        }
    }
}

@Composable
private fun FeaturedDish(dish: Dish, onDish: (Dish) -> Unit) {
    GlassPanel(Modifier.fillMaxWidth().clickable { onDish(dish) }, radius = 24.dp) {
        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            GlassPhoto(dish.image, dish.title, Modifier.size(116.dp))
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("ПОПУЛЯРНОЕ", color = Leaf, fontSize = 8.sp, letterSpacing = 1.2.sp)
                Text(dish.title, color = Forest, fontFamily = FontFamily.Serif, fontSize = 21.sp, lineHeight = 23.sp)
                Text(priceLabel(dish), color = Charcoal, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text("Подробнее  →", color = Leaf, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun CategoryCard(title: String, photo: String, modifier: Modifier, onClick: () -> Unit) {
    GlassPanel(modifier.clickable(onClick = onClick), radius = 21.dp) {
        Column {
            GlassPhoto(photo, title, Modifier.fillMaxWidth().height(105.dp))
            Text(title, Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                color = Forest, fontFamily = FontFamily.Serif, fontSize = 18.sp)
        }
    }
}

@Composable
private fun CartPage(
    cart: Map<String, Int>,
    onPlus: (String) -> Unit,
    onMinus: (String) -> Unit,
    onRemove: (String) -> Unit,
    onCheckout: () -> Unit
) {
    val selected = menu.filter { (cart[it.id] ?: 0) > 0 }
    val total = selected.sumOf { dishCost(it, cart[it.id] ?: 0) }
    Column(Modifier.fillMaxSize()) {
        SectionTitle("ВАШ ВЫБОР", "Корзина")
        Spacer(Modifier.height(12.dp))
        if (selected.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                GlassPanel(Modifier.fillMaxWidth(), radius = 25.dp) {
                    Column(Modifier.padding(25.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.ShoppingBag, null, tint = Leaf, modifier = Modifier.size(42.dp))
                        Text("Корзина пока пуста", color = Forest, fontFamily = FontFamily.Serif, fontSize = 23.sp)
                        Text("Добавьте любимые блюда из каталога.", color = Fog, fontSize = 12.sp)
                    }
                }
            }
        } else {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(9.dp),
                contentPadding = PaddingValues(bottom = 12.dp)) {
                items(selected, key = { it.id }) { dish ->
                    val count = cart[dish.id] ?: 0
                    GlassPanel(Modifier.fillMaxWidth(), radius = 20.dp) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            GlassPhoto(dish.image, dish.title, Modifier.size(76.dp))
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(dish.title, color = Charcoal, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                Text(priceLabel(dish), color = Fog, fontSize = 10.sp)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = { onMinus(dish.id) }, modifier = Modifier.size(30.dp)) {
                                        Icon(Icons.Default.Remove, null, tint = Forest)
                                    }
                                    Text(count.toString() + if (dish.id == "meatballs") " пач." else " шт.", color = Forest, fontSize = 12.sp)
                                    IconButton(onClick = { onPlus(dish.id) }, modifier = Modifier.size(30.dp)) {
                                        Icon(Icons.Default.Add, null, tint = Forest)
                                    }
                                }
                            }
                            IconButton(onClick = { onRemove(dish.id) }) { Icon(Icons.Default.DeleteOutline, null, tint = Fog) }
                        }
                    }
                }
            }
            GlassPanel(Modifier.fillMaxWidth().padding(bottom = 8.dp), radius = 23.dp) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Итого за товары", color = Fog, fontSize = 13.sp)
                        Text(total.toString() + " сомони", color = Forest, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    }
                    Text("Доставка согласуется при подтверждении заказа.", color = Fog, fontSize = 10.sp)
                    GlassButton("Оформить заказ", onCheckout, Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun DishSheet(dish: Dish, onClose: () -> Unit, onAdd: () -> Unit) {
    AlertDialog(
        onDismissRequest = onClose,
        containerColor = Color(0xFFF9F8F2),
        title = { Text(dish.title, fontFamily = FontFamily.Serif, color = Forest, fontSize = 24.sp) },
        text = {
            Column(Modifier.heightIn(max = 430.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)) {
                GlassPhoto(dish.image, dish.title, Modifier.fillMaxWidth().height(205.dp))
                Text(dish.note, color = Fog, fontSize = 13.sp, lineHeight = 19.sp)
                Text(priceLabel(dish), color = Forest, fontWeight = FontWeight.Bold)
                Text("Состав и возможные аллергены можно уточнить перед заказом.", color = Fog, fontSize = 11.sp)
            }
        },
        confirmButton = { TextButton(onClick = onAdd) { Text("Добавить", color = Forest) } },
        dismissButton = { TextButton(onClick = onClose) { Text("Закрыть", color = Fog) } }
    )
}

@Composable
private fun CheckoutSheet(
    busy: Boolean,
    onClose: () -> Unit,
    onSubmit: (String, String, String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("+992 ") }
    var address by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onClose,
        containerColor = Color(0xFFF9F8F2),
        title = { Text("Оформление заказа", fontFamily = FontFamily.Serif, color = Forest, fontSize = 23.sp) },
        text = {
            Column(Modifier.heightIn(max = 460.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Оставьте контакты. Мы свяжемся с вами для подтверждения.", color = Fog, fontSize = 12.sp)
                OutlinedTextField(name, { name = it; error = null }, label = { Text("Ваше имя") }, singleLine = true)
                OutlinedTextField(phone, { phone = it; error = null }, label = { Text("Номер телефона") }, singleLine = true)
                OutlinedTextField(address, { address = it; error = null }, label = { Text("Адрес доставки") }, minLines = 2)
                OutlinedTextField(note, { note = it }, label = { Text("Комментарий, необязательно") }, minLines = 2)
                error?.let { Text(it, color = Color(0xFFAA5148), fontSize = 11.sp) }
                if (busy) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Leaf)
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val digits = phone.filter { it.isDigit() }
                when {
                    name.trim().length < 2 -> error = "Укажите имя."
                    digits.length !in 7..15 -> error = "Проверьте номер телефона."
                    address.trim().length < 5 -> error = "Укажите адрес доставки."
                    else -> onSubmit(name.trim(), phone.trim(), address.trim(), note.trim())
                }
            }) { Text(if (busy) "Отправка…" else "Отправить заказ", color = Forest) }
        },
        dismissButton = { TextButton(enabled = !busy, onClick = onClose) { Text("Отмена", color = Fog) } }
    )
}

@Composable
private fun AboutPage(onInstagram: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SectionTitle("ЗНАКОМСТВО С НАМИ", "О LEPÍ")
        GlassPhoto("packaging.jpg", "Упаковка LEPÍ", Modifier.fillMaxWidth().height(210.dp))
        GlassPanel(Modifier.fillMaxWidth(), radius = 23.dp) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Text("Домашний вкус. Без лишней суеты.", color = Forest, fontFamily = FontFamily.Serif, fontSize = 25.sp)
                Text("LEPÍ — домашние полуфабрикаты, приготовленные с заботой. Мы помогаем экономить время и чаще собираться за вкусным столом.",
                    color = Fog, fontSize = 13.sp, lineHeight = 20.sp)
                Text("Доставка по Худжанду", color = Charcoal, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                GlassButton("Instagram @lepifoods", onInstagram, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun SectionTitle(eyebrow: String, title: String) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(eyebrow, color = Leaf, fontSize = 9.sp, letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
        Text(title, color = Forest, fontFamily = FontFamily.Serif, fontSize = 29.sp)
    }
}

@Composable
private fun GlassPanel(
    modifier: Modifier = Modifier,
    radius: androidx.compose.ui.unit.Dp = 24.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(radius),
        color = GlassWhite,
        border = BorderStroke(1.dp, Brush.linearGradient(listOf(Color.White, Color(0x88FFFFFF), Color(0x66A9BBA0)))),
        shadowElevation = 5.dp,
        content = { Column(content = content) }
    )
}

@Composable
private fun GlassButton(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false
) {
    val pressedScale by animateFloatAsState(1f, label = "button-scale")
    Surface(
        modifier = modifier.scale(pressedScale).clickable(onClick = onClick),
        shape = RoundedCornerShape(if (compact) 13.dp else 17.dp),
        color = Color(0xFFE1E9DC),
        border = BorderStroke(1.dp, Color.White),
        shadowElevation = 2.dp
    ) {
        Row(Modifier.fillMaxWidth().padding(vertical = if (compact) 8.dp else 14.dp),
            horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text(title, color = Forest, fontSize = if (compact) 10.sp else 13.sp, fontWeight = FontWeight.SemiBold)
            if (!compact) {
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Default.ArrowForward, null, tint = Forest, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
private fun GlassIconButton(icon: ImageVector, count: Int, onClick: () -> Unit) {
    Box {
        Surface(
            modifier = Modifier.size(46.dp).clickable(onClick = onClick),
            shape = CircleShape, color = GlassWhite,
            border = BorderStroke(1.dp, Color.White), shadowElevation = 3.dp
        ) {
            Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = Forest) }
        }
        if (count > 0) {
            Surface(Modifier.align(Alignment.TopEnd), shape = CircleShape, color = Forest) {
                Text(count.toString(), Modifier.padding(horizontal = 5.dp, vertical = 2.dp), color = Color.White, fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun GlassPhoto(file: String, description: String, modifier: Modifier = Modifier) {
    Box(modifier.clip(RoundedCornerShape(18.dp))) {
        Box(Modifier.fillMaxSize().background(
            Brush.linearGradient(listOf(Color(0xFFE4EBDD), Color(0xFFF8F6EE), Color(0xFFD9E2D2)))
        ))
        AsyncImage(
            model = IMAGE_ROOT + file,
            contentDescription = description,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
    }
}

private fun dishCost(dish: Dish, quantity: Int): Double = when (dish.id) {
    "classic" -> quantity * 6.0
    "beef" -> quantity * 10.0
    "chopped" -> if (quantity <= 8) 60.0 else 60.0 + (quantity - 8) * 7.5
    "meatballs" -> quantity * 25.0
    else -> quantity * dish.price
}

private fun money(value: Double): String = if (value % 1.0 == 0.0) value.toInt().toString() else String.format(java.util.Locale.US, "%.2f", value)

private fun priceLabel(dish: Dish): String = money(dishCost(dish, dish.minQty)) + " сомони · " + (if (dish.id == "meatballs") "250 г" else dish.minQty.toString() + " шт.")

private suspend fun sendOrder(
    name: String,
    phone: String,
    address: String,
    note: String,
    cart: Map<String, Int>
): String = withContext(Dispatchers.IO) {
    val items = JSONArray()
    cart.forEach { entry ->
        items.put(JSONObject().put("id", entry.key).put("quantity", entry.value))
    }
    val body = JSONObject()
        .put("name", name).put("phone", phone).put("address", address)
        .put("comment", note).put("items", items)
    val connection = (URL("https://lepi-orders.onrender.com/api/order").openConnection() as HttpURLConnection)
    try {
        connection.requestMethod = "POST"
        connection.connectTimeout = 12000
        connection.readTimeout = 18000
        connection.doOutput = true
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        connection.setRequestProperty("Origin", "https://lepikatalog.onrender.com")
        connection.setRequestProperty("X-Order-Request-Id", UUID.randomUUID().toString())
        connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val response = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        if (code !in 200..299) {
            val error = runCatching { JSONObject(response).optString("error") }.getOrNull()
            throw IllegalStateException(error?.takeIf { it.isNotBlank() } ?: "Ошибка сервера: " + code)
        }
        val json = JSONObject(response)
        json.optJSONObject("tracking")?.optString("orderNumber").orEmpty()
    } finally { connection.disconnect() }
}

private fun readCart(context: Context): Map<String, Int> = try {
    val raw = context.getSharedPreferences("lepi_glass_cart", Context.MODE_PRIVATE).getString("items", "{}") ?: "{}"
    val json = JSONObject(raw)
    buildMap {
        json.keys().forEach { key ->
            val value = json.optInt(key, 0)
            val dish = menu.firstOrNull { it.id == key }
            if (dish != null && value >= dish.minQty && value <= 999) put(key, value)
        }
    }
} catch (_: Exception) { emptyMap() }

private fun writeCart(context: Context, cart: Map<String, Int>) {
    val json = JSONObject()
    cart.forEach { json.put(it.key, it.value) }
    context.getSharedPreferences("lepi_glass_cart", Context.MODE_PRIVATE)
        .edit().putString("items", json.toString()).apply()
}

private fun openInstagram(context: Context) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.instagram.com/lepifoods/")))
    }
}
