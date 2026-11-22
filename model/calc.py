# Модель ДЗ 2.3: 12 месяцев после пилота, прирост операционной прибыли Ozon
S = ["Осторожный","Базовый","Сильный"]
P = dict(
 orders_scope   =[10e6,10e6,10e6],   # заказов fashion в категориях с примеркой / мес
 adoption       =[0.02,0.04,0.06],   # доля заказов, где пользовались примеркой
 price          =[3000,3000,3000],   # средняя цена выкупленного товара, ₽
 take           =[0.25,0.25,0.25],   # комиссия Ozon от цены
 buyout         =[0.65,0.65,0.65],   # выкуп без примерки
 size_share     =[0.50,0.50,0.50],   # доля размерных среди возвратов
 size_cut       =[0.04,0.10,0.15],   # снижение размерных возвратов, отн.
 conv_uplift    =[0.00,0.05,0.10],   # прирост заказов у использовавших, отн.
 cannib         =[0.10,0.05,0.00],
 var_cost       =[95,95,95],         # переменные затраты на новый выкуп, ₽
 ret_cost       =[50,50,50],         # затраты Ozon на обработку возврата, ₽
 gens_per_order =[10,10,10],
 cache          =[0.50,0.60,0.70],
 gen_cost       =[3.0,2.5,2.0],
 sku            =[200e3,200e3,200e3],
 body_types     =[7,7,7],
 refresh        =[2,2,2],
 cdn_m          =[0.3e6,0.3e6,0.3e6],
 dev            =[10.8e6,10.8e6,10.8e6],   # 6 чел × 4 мес × 450 тыс
 ops            =[10.8e6,10.8e6,10.8e6],   # 2 FTE × 12 мес × 450 тыс
 complaint_rate =[0.005,0.005,0.005], complaint_cost=[150,150,150],
 legal          =[1e6,1e6,1e6],
)
def run(i, **ov):
    p={k:v[i] for k,v in P.items()}; p.update(ov)
    T=p['orders_scope']*p['adoption']
    b1=p['buyout']+(1-p['buyout'])*p['size_share']*p['size_cut']
    avoided=T*(b1-p['buyout'])
    new_orders=T*p['conv_uplift']*(1-p['cannib'])
    new_buy=new_orders*b1; new_ret=new_orders*(1-b1)
    m=lambda x:x*12
    r=dict(T=T,avoided=avoided,new_orders=new_orders,new_buy=new_buy)
    r['gmv']=m((avoided+new_buy)*p['price'])
    r['rev_avoid']=m(avoided*p['price']*p['take'])
    r['rev_new']=m(new_buy*p['price']*p['take'])
    r['ret_save']=m(avoided*p['ret_cost'])
    r['var']=m(new_buy*p['var_cost']); r['new_ret']=m(new_ret*p['ret_cost'])
    r['gross']=r['rev_avoid']+r['rev_new']+r['ret_save']-r['var']-r['new_ret']
    r['live']=m(T*p['gens_per_order']*(1-p['cache'])*p['gen_cost'])
    r['pregen']=p['sku']*p['body_types']*p['refresh']*p['gen_cost']
    r['cdn']=m(p['cdn_m'])
    r['team']=p['dev']+p['ops']
    r['support']=m(T*p['complaint_rate']*p['complaint_cost'])+p['legal']
    r['costs']=r['live']+r['pregen']+r['cdn']+r['team']+r['support']
    r['profit']=r['gross']-r['costs']
    return r
if __name__=="__main__":
    for i,s in enumerate(S):
        r=run(i); print(s,{k:round(v/1e6,1) if v>1e5 else round(v) for k,v in r.items()})
    b=run(1)['profit']
    print("\nчувствительность базового, Δ млн:")
    for k,v in [('size_cut',0.05),('size_cut',0.15),('conv_uplift',0.0),('conv_uplift',0.10),('gen_cost',4.0),('take',0.18),('adoption',0.02),('adoption',0.06),('cache',0.3)]:
        print(k,v,round((run(1,**{k:v})['profit']-b)/1e6,1))
    # порог adoption для нуля в базовом
    lo,hi=0.001,0.2
    for _ in range(60):
        mid=(lo+hi)/2; lo,hi=(mid,hi) if run(1,adoption=mid)['profit']<0 else (lo,mid)
    print("порог adoption база",round(hi*100,2),"%")
    for i in range(3):
        lo,hi=0,0.3
        f=lambda x:run(i,size_cut=x,conv_uplift=0)['profit']
        print(S[i],"безуб. только возвраты: size_cut", [round(x,3) for x in [0]], round(f(0.10)/1e6,1))
