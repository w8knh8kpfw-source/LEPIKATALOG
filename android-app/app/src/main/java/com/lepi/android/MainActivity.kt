package com.lepi.android

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

private val Cream = Color(0xFFF5F2E9)
private val Paper = Color(0xFFFFFEFA)
private val Ink = Color(0xFF30372E)
private val Muted = Color(0xFF85897D)
private val Green = Color(0xFF667B5B)
private val DeepGreen = Color(0xFF43583E)
private val SoftGreen = Color(0xFFE5EADC)
private val Line = Color(0xFFE6E8DE)
private const val IMAGE_ROOT = "https://raw.githubusercontent.com/w8knh8kpfw-source/LEPIKATALOG/main/images/"
private fun image(name: String) = IMAGE_ROOT + name

private data class Product(val id:String,val name:String,val category:String,val price:Double,val min:Int,val badge:String,val description:String,val photo:String,val ingredients:List<String>) {
    val imageUrl get() = image(photo)
}
private val products = listOf(
    Product("chicken","Куриные котлеты с овощами","Котлеты",7.0,10,"Хит продаж","Домашние куриные котлеты с овощами. Минимум 10 штук.", "cutlets-chicken-veg.jpg", listOf("Куриное филе","Лук","Морковь","Чеснок","Сливочное масло","Рисовая мука","Панировочные сухари","Соль","Чёрный молотый перец")),
    Product("classic","Сырники классические","Сырники",6.0,10,"Классика","6 сомони за штуку или 60 сомони за 10 штук.","syrniki-classic.jpg",listOf("Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Ванилин","Соль")),
    Product("choco","Сырники шоколадные","Сырники",7.0,10,"Популярное","Шоколадные сырники. 10 штук — 70 сомони.","syrniki-chocolate.jpg",listOf("Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Молочный шоколад","Ванилин")),
    Product("rafaello","Сырники «Рафаэлло»","Сырники",7.0,10,"Десерт","Сырники с белым шоколадом и кокосовой стружкой.","syrniki-rafaello.jpg",listOf("Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Белый шоколад","Кокосовая стружка","Ванилин")),
    Product("varenko","Сырники с варёнкой","Сырники",7.0,10,"Новинка","Сырники с варёной сгущёнкой.","syrniki-varenka.jpg",listOf("Творог 5%","Яйцо","Рисовая мука","Манная крупа","Сахар","Варёная сгущёнка","Ванилин")),
    Product("beef","Говяжьи котлеты","Котлеты",10.0,10,"Говядина","10 сомони за штуку или 100 сомони за 10 штук.","cutlets-beef.jpg",listOf("Говядина","Лук","Мякоть батона","Молоко","Яйцо","Сливочное масло","Панировочные сухари","Чеснок","Соль","Чёрный молотый перец")),
    Product("meatp","Блинчики с мясом","Блинчики",9.0,10,"Хит продаж","Сытные блинчики с мясной начинкой.","crepes-meat.jpg",listOf("Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин, растительное и сливочное масло","Начинка: говядина, лук, сливочное масло, соль, перец")),
    Product("curdp","Блинчики с творогом","Блинчики",6.0,10,"Любимый вкус","Блинчики с творожной начинкой.","crepes-curd.jpg",listOf("Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин","Начинка: творог 5%, сахар, сливочное масло, ванилин")),
    Product("condensed","Блинчики с варёной сгущёнкой","Блинчики",6.0,10,"Новинка","Сладкие блинчики с варёной сгущёнкой.","crepes-condensed.jpg",listOf("Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин","Начинка: варёная сгущёнка, грецкие орехи")),
    Product("apple","Блинчики с яблоком и корицей","Блинчики",7.0,10,"Хит сезона","Ароматное сочетание яблока и корицы.","crepes-apple.jpg",listOf("Тесто: молоко, пшеничная мука, яйцо, сахар, соль, ванилин","Начинка: яблоки, тростниковый сахар, сливочное масло, корица, лимонный сок")),
    Product("chopped","Рубленые куриные котлеты","Котлеты",7.5,8,"Минимум 8 штук","Минимальный заказ — 8 штук за 60 сомони.","cutlets-chopped-chicken.jpg",listOf("Куриное филе","Сыр","Лук","Панировочные сухари","Яйцо","Укроп","Чеснок","Соль","Чёрный молотый перец")),
    Product("meatballs","Фрикадельки","Фрикадельки",25.0,1,"250 г","Одна пачка весом 250 г — 25 сомони.","meatballs.jpg",listOf("Куриное филе","Лук","Панировочные сухари","Яйцо","Соль","Чёрный молотый перец"))
)
private data class Review(val name:String,val text:String,val photo:String?)
private data class OrderResult(val number:String?,val url:String?)

private object Api {
    private const val BASE = "https://lepi-orders.onrender.com"
    private suspend fun request(path:String,method:String="GET",body:String?=null,requestId:String?=null):String = withContext(Dispatchers.IO) {
        val c = URL(BASE + path).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 18000
            c.readTimeout = 25000
            c.setRequestProperty("Accept","application/json")
            if (method == "POST") {
                c.doOutput = true
                c.setRequestProperty("Content-Type","application/json; charset=utf-8")
                c.setRequestProperty("Origin","https://lepikatalog.onrender.com")
                c.setRequestProperty("X-Order-Request-Id",requestId ?: UUID.randomUUID().toString())
                c.outputStream.use { it.write((body ?: "{}").toByteArray(Charsets.UTF_8)) }
            }
            val code = c.responseCode
            val stream = if (code in 200..299) c.inputStream else c.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val message = runCatching { JSONObject(text).optString("error") }.getOrNull().orEmpty()
                throw IOException(message.ifBlank { "Ошибка сервера: " + code })
            }
            text
        } finally { c.disconnect() }
    }
    suspend fun statuses():Map<String,String> {
        val source = JSONObject(request("/api/product-statuses")).getJSONObject("statuses")
        return products.associate { it.id to source.optString(it.id,"unknown") }
    }
    suspend fun reviews():List<Review> {
        val array = JSONObject(request("/api/reviews")).optJSONArray("reviews") ?: JSONArray()
        return (0 until array.length()).map {
            val item = array.getJSONObject(it)
            Review(item.optString("name","Покупатель LEPÍ"),item.optString("text"),item.optString("photo").takeIf { url -> url.startsWith("https://") })
        }
    }
    suspend fun order(name:String,phone:String,address:String,comment:String,cart:Map<String,Int>):OrderResult {
        val rows = JSONArray()
        cart.forEach { (id,qty) -> rows.put(JSONObject().put("id",id).put("quantity",qty)) }
        val body = JSONObject().put("name",name).put("phone",phone).put("address",address).put("comment",comment).put("items",rows)
        val result = JSONObject(request("/api/order","POST",body.toString(),UUID.randomUUID().toString()))
        val tracking = result.optJSONObject("tracking")
        return OrderResult(tracking?.optString("orderNumber"),tracking?.optString("url"))
    }
}

private enum class Tab(val label:String,val icon:ImageVector) {
    HOME("Главная",Icons.Default.Home), CATALOG("Каталог",Icons.Default.MenuBook),
    CART("Корзина",Icons.Default.ShoppingCart), REVIEWS("Отзывы",Icons.Default.Star), ABOUT("О нас",Icons.Default.Info)
}

class MainActivity:ComponentActivity() {
    override fun onCreate(savedInstanceState:Bundle?) { super.onCreate(savedInstanceState); setContent { LepiApp(this) } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun LepiApp(context:Context) {
    var tab by remember { mutableStateOf(Tab.HOME) }
    val cart = remember { mutableStateMapOf<String,Int>().apply { putAll(loadCart(context)) } }
    val statuses = remember { mutableStateMapOf<String,String>() }
    val reviews = remember { mutableStateListOf<Review>() }
    var loadingReviews by remember { mutableStateOf(true) }
    var selected by remember { mutableStateOf<Product?>(null) }
    var checkout by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf<OrderResult?>(null) }
    val scope = rememberCoroutineScope()
    val wide = LocalConfiguration.current.screenWidthDp >= 720
    val count = cart.values.sum()
    LaunchedEffect(Unit) {
        runCatching { statuses.putAll(Api.statuses()) }
        try { reviews.addAll(Api.reviews()) } catch (_:Exception) { } finally { loadingReviews = false }
    }
    LaunchedEffect(cart.toMap()) { saveCart(context,cart.toMap()) }
    MaterialTheme(colorScheme = lightColorScheme(primary=Green,secondary=DeepGreen,background=Cream,surface=Paper,onSurface=Ink)) {
        Scaffold(
            containerColor=Cream,
            topBar={ CenterAlignedTopAppBar(
                title={ Column(horizontalAlignment=Alignment.CenterHorizontally) {
                    Text("LEPÍ",fontFamily=FontFamily.Serif,fontSize=28.sp,fontWeight=FontWeight.SemiBold,letterSpacing=4.sp,color=DeepGreen)
                    Text("ВКУС ДОМАШНЕГО УЮТА",fontSize=8.sp,letterSpacing=1.8.sp,color=Muted)
                } },
                actions={ BadgedBox(badge={ if(count>0) Badge { Text(count.toString()) } }) {
                    IconButton(onClick={tab=Tab.CART}) { Icon(Icons.Default.ShoppingCart,contentDescription="Корзина",tint=DeepGreen) }
                } },
                colors=TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor=Cream)
            ) },
            bottomBar={ if(!wide) NavigationBar(containerColor=Paper) {
                Tab.entries.forEach { item -> NavigationBarItem(selected=tab==item,onClick={tab=item},icon={Icon(item.icon,contentDescription=item.label)},label={Text(item.label,fontSize=10.sp)}) }
            } }
        ) { pad ->
            Row(Modifier.fillMaxSize().padding(pad)) {
                if(wide) NavigationRail(containerColor=Cream) {
                    Tab.entries.forEach { item -> NavigationRailItem(selected=tab==item,onClick={tab=item},icon={Icon(item.icon,contentDescription=item.label)},label={Text(item.label,fontSize=10.sp)},alwaysShowLabel=true) }
                }
                Box(Modifier.weight(1f).fillMaxHeight()) {
                    when(tab) {
                        Tab.HOME -> HomeScreen({tab=Tab.CATALOG},{selected=it})
                        Tab.CATALOG -> CatalogScreen(statuses,{selected=it},{ p -> cart[p.id]=(cart[p.id] ?: 0).let { q -> if(q==0) p.min else q+1 } })
                        Tab.CART -> CartScreen(cart,{id -> cart[id]=(cart[id] ?: 0)+1},{id -> val p=products.first{it.id==id}; val q=cart[id] ?: 0; if(q<=p.min) cart.remove(id) else cart[id]=q-1},{id->cart.remove(id)},{checkout=true})
                        Tab.REVIEWS -> ReviewsScreen(reviews,loadingReviews)
                        Tab.ABOUT -> AboutScreen(context)
                    }
                }
            }
        }
        selected?.let { p -> ProductDialog(p,statuses[p.id] ?: "unknown",{selected=null},{
            cart[p.id]=(cart[p.id] ?: 0).let { if(it==0) p.min else it+1 }; selected=null; tab=Tab.CART
        }) }
        if(checkout) CheckoutDialog({checkout=false}) { name,phone,address,comment ->
            scope.launch {
                val result=Api.order(name,phone,address,comment,cart.toMap())
                cart.clear(); checkout=false; success=result
            }
        }
        success?.let { result -> AlertDialog(onDismissRequest={success=null},containerColor=Paper,
            icon={Icon(Icons.Default.CheckCircle,contentDescription=null,tint=Green,modifier=Modifier.size(42.dp))},
            title={Text("Спасибо за заказ!",color=DeepGreen)},
            text={Column(verticalArrangement=Arrangement.spacedBy(8.dp)) {
                Text("Мы получили ваш заказ. Скоро свяжемся с вами для подтверждения.")
                if(!result.number.isNullOrBlank()) Text("Номер заказа: " + result.number,fontWeight=FontWeight.Bold)
                if(!result.url.isNullOrBlank()) TextButton(onClick={openUrl(context,result.url)}) { Text("Отследить заказ") }
            }},
            confirmButton={TextButton(onClick={success=null}) { Text("Готово") }})
        }
    }
}

@Composable private fun Heading(kicker:String,title:String) {
    Column(verticalArrangement=Arrangement.spacedBy(3.dp)) {
        Text(kicker.uppercase(),color=Green,fontSize=9.sp,letterSpacing=1.5.sp,fontWeight=FontWeight.Bold)
        Text(title,fontFamily=FontFamily.Serif,fontSize=30.sp,color=Ink)
    }
}
@Composable private fun HomeScreen(onCatalog:()->Unit,onProduct:(Product)->Unit) {
    val apple=products.first{it.id=="apple"}
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(17.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
        Surface(shape=RoundedCornerShape(28.dp),color=SoftGreen,border=BorderStroke(1.dp,Color.White)) {
            Column {
                AsyncImage(image("hero-bags.jpg"),"Фирменная упаковка LEPÍ",Modifier.fillMaxWidth().heightIn(min=190.dp,max=300.dp),contentScale=ContentScale.Crop)
                Column(Modifier.padding(21.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
                    Text("ДОМАШНЯЯ КУХНЯ · ХУДЖАНД",color=DeepGreen,fontSize=10.sp,letterSpacing=1.5.sp,fontWeight=FontWeight.Bold)
                    Text("Вкус, который\\nсогревает.",fontFamily=FontFamily.Serif,fontSize=42.sp,lineHeight=44.sp,color=Ink)
                    Text("Любимые домашние блюда, приготовленные с заботой. Заготовки, чтобы вкусный домашний стол не требовал долгих приготовлений.",color=Muted,fontSize=13.sp,lineHeight=21.sp)
                    Button(onClick=onCatalog,colors=ButtonDefaults.buttonColors(containerColor=Green),shape=RoundedCornerShape(14.dp)) {
                        Text("Открыть каталог"); Spacer(Modifier.width(8.dp)); Icon(Icons.Default.ArrowForward,null,Modifier.size(17.dp))
                    }
                }
            }
        }
        Heading("ХИТ СЕЗОНА","Яблоко и корица")
        Surface(shape=RoundedCornerShape(23.dp),color=Paper,border=BorderStroke(1.dp,Color.White),modifier=Modifier.fillMaxWidth().clickable{onProduct(apple)}) {
            Column {
                AsyncImage(image("season-crepes.jpg"),"Блинчики с яблоком и корицей",Modifier.fillMaxWidth().height(210.dp),contentScale=ContentScale.Crop)
                Column(Modifier.padding(15.dp)) {
                    Text("НОВИНКА LEPÍ",color=Green,fontSize=10.sp,letterSpacing=1.3.sp,fontWeight=FontWeight.Bold)
                    Text(apple.name,fontFamily=FontFamily.Serif,fontSize=25.sp,color=Ink)
                    Text("10 штук — 70 сомони",color=Muted,fontSize=12.sp)
                }
            }
        }
        Heading("ВЫБЕРИТЕ СВОЁ","Любимые категории")
        LazyVerticalGrid(columns=GridCells.Fixed(2),modifier=Modifier.height(265.dp),userScrollEnabled=false,horizontalArrangement=Arrangement.spacedBy(9.dp),verticalArrangement=Arrangement.spacedBy(9.dp)) {
            item { CategoryTile("Блинчики","crepes-process.jpg",onCatalog) }
            item { CategoryTile("Сырники","syrniki-classic.jpg",onCatalog) }
            item { CategoryTile("Котлеты","cutlets-chicken-veg.jpg",onCatalog) }
            item { CategoryTile("Фрикадельки","meatballs.jpg",onCatalog) }
        }
        Surface(shape=RoundedCornerShape(22.dp),color=Paper,border=BorderStroke(1.dp,Color.White)) {
            Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                AsyncImage(image("packaging.jpg"),"Упаковка LEPÍ",Modifier.size(100.dp).clip(RoundedCornerShape(16.dp)),contentScale=ContentScale.Crop)
                Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                    Text("НЕМНОГО О НАС",color=Green,fontSize=9.sp,letterSpacing=1.2.sp,fontWeight=FontWeight.Bold)
                    Text("Домашний вкус. Без лишней суеты.",fontFamily=FontFamily.Serif,fontSize=21.sp,color=Ink)
                    Text("Удобные заготовки для уютных домашних моментов.",color=Muted,fontSize=11.sp)
                }
            }
        }
        Text("LEPÍ · Худжанд, Таджикистан",color=Muted,fontSize=11.sp,modifier=Modifier.align(Alignment.CenterHorizontally))
    }
}
@Composable private fun CategoryTile(title:String,photo:String,onClick:()->Unit) {
    Box(Modifier.fillMaxSize().clip(RoundedCornerShape(17.dp)).clickable(onClick=onClick)) {
        AsyncImage(image(photo),title,Modifier.fillMaxSize(),contentScale=ContentScale.Crop)
        Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color(0x99000000)).padding(11.dp)) {
            Text(title,color=Color.White,fontFamily=FontFamily.Serif,fontSize=21.sp)
        }
    }
}
@Composable private fun CatalogScreen(statuses:Map<String,String>,onProduct:(Product)->Unit,onAdd:(Product)->Unit) {
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Все") }
    val categories=listOf("Все","Блинчики","Сырники","Котлеты","Фрикадельки")
    val filtered=products.filter { (category=="Все" || it.category==category) && (query.isBlank() || it.name.contains(query,true)) }
    Column(Modifier.fillMaxSize().padding(horizontal=15.dp,vertical=12.dp)) {
        Heading("НАШЕ МЕНЮ","Каталог LEPÍ")
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(query,{query=it},Modifier.fillMaxWidth(),placeholder={Text("Найти любимое блюдо…",fontSize=13.sp)},leadingIcon={Icon(Icons.Default.Search,null,tint=Muted)},singleLine=true,shape=RoundedCornerShape(14.dp))
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(6.dp)) {
            categories.forEach { FilterChip(selected=category==it,onClick={category=it},label={Text(if(it=="Все") "Всё меню" else it,fontSize=11.sp)}) }
        }
        Text(filtered.size.toString()+" товаров · цены в сомони",color=Muted,fontSize=10.sp,modifier=Modifier.padding(vertical=7.dp))
        if(filtered.isEmpty()) Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){Text("Ничего не найдено",color=Muted)}
        else LazyVerticalGrid(columns=GridCells.Adaptive(155.dp),modifier=Modifier.weight(1f),contentPadding=PaddingValues(bottom=20.dp),horizontalArrangement=Arrangement.spacedBy(9.dp),verticalArrangement=Arrangement.spacedBy(9.dp)) {
            items(filtered,key={it.id}) { p -> ProductCard(p,statuses[p.id] ?: "unknown",onProduct){onAdd(p)} }
        }
    }
}
@Composable private fun ProductCard(p:Product,status:String,onProduct:(Product)->Unit,onAdd:()->Unit) {
    Surface(Modifier.fillMaxWidth().clickable{onProduct(p)},color=Paper,shape=RoundedCornerShape(19.dp),border=BorderStroke(1.dp,Color.White),shadowElevation=2.dp) {
        Column {
            Box {
                AsyncImage(p.imageUrl,p.name,Modifier.fillMaxWidth().aspectRatio(1f),contentScale=ContentScale.Crop)
                Surface(Modifier.align(Alignment.TopStart).padding(7.dp),color=Color(0xEFFFFFFF),shape=RoundedCornerShape(30.dp)){Text(p.badge,Modifier.padding(horizontal=8.dp,vertical=5.dp),fontSize=9.sp,color=DeepGreen)}
            }
            Column(Modifier.padding(10.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                Text(p.category.uppercase(),color=Muted,fontSize=8.sp,letterSpacing=1.sp)
                Text(p.name,color=Ink,fontWeight=FontWeight.SemiBold,fontSize=12.sp,minLines=2,maxLines=2,overflow=TextOverflow.Ellipsis)
                Text(statusText(status),color=statusColor(status),fontSize=9.sp)
                Text(priceText(p),color=DeepGreen,fontSize=11.sp,fontWeight=FontWeight.Bold)
                Button(onClick=onAdd,enabled=status!="unavailable",modifier=Modifier.fillMaxWidth().height(36.dp),shape=RoundedCornerShape(11.dp),contentPadding=PaddingValues(5.dp),colors=ButtonDefaults.buttonColors(containerColor=Green)){Icon(Icons.Default.Add,null,Modifier.size(15.dp));Text("Добавить",fontSize=10.sp)}
            }
        }
    }
}
@Composable private fun ProductDialog(p:Product,status:String,onClose:()->Unit,onAdd:()->Unit) {
    AlertDialog(onDismissRequest=onClose,containerColor=Paper,title={Text(p.name,fontFamily=FontFamily.Serif,fontSize=24.sp,color=DeepGreen)},text={
        Column(Modifier.heightIn(max=490.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(9.dp)) {
            AsyncImage(p.imageUrl,p.name,Modifier.fillMaxWidth().height(205.dp).clip(RoundedCornerShape(16.dp)),contentScale=ContentScale.Crop)
            Text(p.description,color=Muted,fontSize=13.sp)
            Text("Наличие: "+statusText(status),color=statusColor(status),fontWeight=FontWeight.SemiBold,fontSize=12.sp)
            Text(priceText(p),color=DeepGreen,fontWeight=FontWeight.Bold)
            Text("СОСТАВ",color=Green,fontSize=10.sp,fontWeight=FontWeight.Bold,letterSpacing=1.3.sp)
            p.ingredients.forEach { Text("• "+it,color=Ink,fontSize=12.sp,lineHeight=18.sp) }
            Text("При аллергии уточните информацию перед заказом.",color=Muted,fontSize=10.sp)
        }
    },confirmButton={Button(onClick=onAdd,enabled=status!="unavailable",colors=ButtonDefaults.buttonColors(containerColor=Green)){Text("Добавить в корзину")}},dismissButton={TextButton(onClick=onClose){Text("Закрыть")}})
}
@Composable private fun CartScreen(cart:Map<String,Int>,plus:(String)->Unit,minus:(String)->Unit,remove:(String)->Unit,checkout:()->Unit) {
    val chosen=products.filter{(cart[it.id] ?: 0)>0}
    val total=chosen.sumOf{cost(it,cart[it.id] ?: 0)}
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("ВАШ ВЫБОР","Корзина")
        Spacer(Modifier.height(12.dp))
        if(chosen.isEmpty()) Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.ShoppingCart,null,tint=Green,modifier=Modifier.size(45.dp));Text("Корзина пока пуста",fontFamily=FontFamily.Serif,fontSize=24.sp,color=DeepGreen);Text("Добавьте любимые блюда из каталога.",color=Muted,fontSize=12.sp)}}
        else {
            LazyColumn(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(9.dp),contentPadding=PaddingValues(bottom=10.dp)) {
                items(chosen,key={it.id}) { p ->
                    val q=cart[p.id] ?: 0
                    Surface(color=Paper,shape=RoundedCornerShape(17.dp),border=BorderStroke(1.dp,Color.White)) {
                        Row(Modifier.fillMaxWidth().padding(9.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(9.dp)) {
                            AsyncImage(p.imageUrl,p.name,Modifier.size(75.dp).clip(RoundedCornerShape(12.dp)),contentScale=ContentScale.Crop)
                            Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                                Text(p.name,fontSize=12.sp,fontWeight=FontWeight.SemiBold,color=Ink,maxLines=2)
                                Text(quantityText(p,q)+" · "+money(cost(p,q)),fontSize=10.sp,color=DeepGreen,fontWeight=FontWeight.Bold)
                                Row(verticalAlignment=Alignment.CenterVertically) {
                                    IconButton(onClick={minus(p.id)},modifier=Modifier.size(30.dp)){Icon(Icons.Default.Remove,null,tint=DeepGreen)}
                                    Text(q.toString(),fontSize=12.sp)
                                    IconButton(onClick={plus(p.id)},modifier=Modifier.size(30.dp)){Icon(Icons.Default.Add,null,tint=DeepGreen)}
                                }
                            }
                            IconButton(onClick={remove(p.id)} ){Icon(Icons.Default.Delete,null,tint=Muted)}
                        }
                    }
                }
            }
            Surface(color=Paper,shape=RoundedCornerShape(20.dp),border=BorderStroke(1.dp,Color.White)) {
                Column(Modifier.padding(15.dp),verticalArrangement=Arrangement.spacedBy(9.dp)) {
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text("Итого за товары",color=Muted);Text(money(total),fontWeight=FontWeight.Bold,color=DeepGreen,fontSize=17.sp)}
                    Text("Доставка оплачивается отдельно и согласуется при подтверждении.",fontSize=10.sp,color=Muted)
                    Button(onClick=checkout,modifier=Modifier.fillMaxWidth().height(48.dp),colors=ButtonDefaults.buttonColors(containerColor=Green),shape=RoundedCornerShape(14.dp)){Text("Перейти к оформлению")}
                }
            }
        }
    }
}
@Composable private fun CheckoutDialog(close:()->Unit,submit:(String,String,String,String)->Unit) {
    var name by remember{mutableStateOf("")}
    var phone by remember{mutableStateOf("+992 ")}
    var address by remember{mutableStateOf("")}
    var comment by remember{mutableStateOf("")}
    var busy by remember{mutableStateOf(false)}
    var error by remember{mutableStateOf<String?>(null)}
    val scope=rememberCoroutineScope()
    AlertDialog(onDismissRequest={if(!busy)close()},containerColor=Paper,title={Text("Оформление заказа",fontFamily=FontFamily.Serif,fontSize=25.sp,color=DeepGreen)},text={
        Column(Modifier.heightIn(max=480.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            Text("Оставьте контакты — мы свяжемся с вами для подтверждения.",fontSize=12.sp,color=Muted)
            OutlinedTextField(name,{name=it;error=null},label={Text("Ваше имя")},singleLine=true)
            OutlinedTextField(phone,{phone=it;error=null},label={Text("Номер телефона")},singleLine=true)
            OutlinedTextField(address,{address=it;error=null},label={Text("Адрес доставки")},minLines=2)
            OutlinedTextField(comment,{comment=it;error=null},label={Text("Комментарий (необязательно)")},minLines=2)
            if(error!=null) Text(error!!,color=Color(0xFFAA4D45),fontSize=11.sp)
            if(busy) Row(verticalAlignment=Alignment.CenterVertically){CircularProgressIndicator(Modifier.size(18.dp),color=Green);Spacer(Modifier.width(8.dp));Text("Отправляем заказ…",color=Muted,fontSize=11.sp)}
        }
    },confirmButton={
        Button(enabled=!busy,onClick={
            val digits=phone.filter{it.isDigit()}
            when {
                name.trim().length<2 -> error="Укажите имя (минимум 2 символа)."
                digits.length !in 7..15 -> error="Проверьте номер телефона."
                address.trim().length<5 -> error="Укажите полный адрес доставки."
                else -> {busy=true;scope.launch{try{submit(name.trim(),phone.trim(),address.trim(),comment.trim())}catch(e:Exception){error=e.message ?: "Не удалось отправить заказ.";busy=false}}}
            }
        },colors=ButtonDefaults.buttonColors(containerColor=Green)){Text(if(busy)"Отправка…" else "Отправить заказ")}
    },dismissButton={TextButton(onClick=close,enabled=!busy){Text("Отмена")}})
}
@Composable private fun ReviewsScreen(reviews:List<Review>,loading:Boolean) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("ВАШЕ МНЕНИЕ ВАЖНО","Отзывы о LEPÍ")
        Spacer(Modifier.height(12.dp))
        when {
            loading -> Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator(color=Green)}
            reviews.isEmpty() -> Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.Star,null,tint=Green,modifier=Modifier.size(40.dp));Text("Отзывы скоро появятся здесь",fontFamily=FontFamily.Serif,fontSize=22.sp,color=DeepGreen);Text("Пока их можно посмотреть в Instagram @lepifoods.",fontSize=12.sp,color=Muted)}}
            else -> LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)) {
                items(reviews){r->Surface(color=Paper,shape=RoundedCornerShape(18.dp),border=BorderStroke(1.dp,Color.White)){Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Text(r.name,color=DeepGreen,fontWeight=FontWeight.Bold);Text(r.text,color=Ink,fontSize=13.sp,lineHeight=19.sp);if(r.photo!=null)AsyncImage(r.photo,"Фото отзыва",Modifier.fillMaxWidth().heightIn(max=320.dp).clip(RoundedCornerShape(13.dp)),contentScale=ContentScale.Crop)}}}
            }
        }
    }
}
@Composable private fun AboutScreen(context:Context) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(17.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
        Heading("О НАС","Домашний вкус.\\nБез лишней суеты.")
        AsyncImage(image("packaging.jpg"),"Фирменная упаковка LEPÍ",Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(22.dp)),contentScale=ContentScale.Crop)
        Text("LEPÍ создан для тех дней, когда хочется вкусной домашней еды, но не хочется проводить весь день на кухне. Мы помогаем сделать повседневные моменты немного уютнее.",color=Muted,fontSize=14.sp,lineHeight=22.sp)
        InfoLine(Icons.Default.CheckCircle,"С заботой","Внимание к каждой детали.")
        InfoLine(Icons.Default.LocalShipping,"Доставка по Худжанду","Условия доставки согласуются при подтверждении.")
        InfoLine(Icons.Default.Person,"Для всей семьи","Заготовки на завтрак, обед и к чаю.")
        Button(onClick={openUrl(context,"https://www.instagram.com/lepifoods/")},colors=ButtonDefaults.buttonColors(containerColor=Green)){Text("Открыть Instagram @lepifoods")}
        Text("Худжанд, Таджикистан · LEPÍ",color=Muted,fontSize=11.sp,modifier=Modifier.align(Alignment.CenterHorizontally))
    }
}
@Composable private fun InfoLine(icon:ImageVector,title:String,subtitle:String) {
    Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
        Surface(color=SoftGreen,shape=RoundedCornerShape(12.dp)){Icon(icon,null,tint=DeepGreen,modifier=Modifier.padding(10.dp).size(21.dp))}
        Column { Text(title,fontWeight=FontWeight.SemiBold,color=Ink,fontSize=13.sp);Text(subtitle,color=Muted,fontSize=11.sp) }
    }
}

private fun cost(p:Product,q:Int):Double=when(p.id) {
    "classic" -> (q/10)*60.0+(q%10)*6.0
    "beef" -> (q/10)*100.0+(q%10)*10.0
    "chopped" -> if(q==8)60.0 else 60.0+(q-8)*7.5
    else -> q*p.price
}
private fun money(v:Double)=if(v%1.0==0.0) v.toInt().toString()+" сомони" else "%.2f".format(java.util.Locale.US,v)+" сомони"
private fun priceText(p:Product)=when(p.id) {
    "meatballs" -> "25 сомони · 250 г"
    "classic" -> "от 60 сомони · 10 шт."
    "beef" -> "от 100 сомони · 10 шт."
    "chopped" -> "от 60 сомони · 8 шт."
    else -> "от "+money(cost(p,p.min))+" · 10 шт."
}
private fun quantityText(p:Product,q:Int)=if(p.id=="meatballs") q.toString()+" пач. · "+(q*250)+" г" else q.toString()+" шт."
private fun statusText(s:String)=when(s){"available"->"В наличии";"preorder"->"Готовим по предзаказу";"unavailable"->"Нет в наличии";else->"Наличие уточняется"}
private fun statusColor(s:String)=when(s){"available"->Green;"preorder"->Color(0xFF9A7845);"unavailable"->Color(0xFFAA4D45);else->Muted}
private fun loadCart(c:Context):Map<String,Int> = try {
    val j=JSONObject(c.getSharedPreferences("lepi_cart",Context.MODE_PRIVATE).getString("items","{}") ?: "{}")
    buildMap { j.keys().forEach { id-> val q=j.optInt(id,0);val p=products.find{it.id==id};if(p!=null&&q>=p.min&&q<=999)put(id,q) } }
} catch(_:Exception){emptyMap()}
private fun saveCart(c:Context,cart:Map<String,Int>) {
    val j=JSONObject();cart.forEach{(id,q)->j.put(id,q)}
    c.getSharedPreferences("lepi_cart",Context.MODE_PRIVATE).edit().putString("items",j.toString()).apply()
}
private fun openUrl(c:Context,url:String?) { if(!url.isNullOrBlank()) runCatching{c.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(url)))} }
