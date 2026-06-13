import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserSettings, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  settings: UserSettings | null;
  role: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, shopName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const initialLoadDone = useRef(false);


  useEffect(() => {

    let mounted = true;


    const loadAuth = async () => {

      try {

        const {
          data: { session },
          error
        } = await supabase.auth.getSession();


        if (error) {
          console.error("Session error:", error);
        }


        if (!mounted) return;


        setSession(session);
        setUser(session?.user ?? null);



        if (session?.user) {

          // background loading
          fetchUserData(session.user.id).catch((error)=>{

            console.error(
              "User data error:",
              error
            );

          });

        }


        initialLoadDone.current = true;



      } catch(error){

        console.error(
          "Auth load error:",
          error
        );


      } finally {


        if(mounted){

          setLoading(false);

        }


      }

    };



    loadAuth();





    const {
      data:{
        subscription
      }

    } = supabase.auth.onAuthStateChange(

      async (
        event: AuthChangeEvent,
        session: Session | null
      )=>{


        if(!mounted) return;



        if(
          event === "INITIAL_SESSION" &&
          initialLoadDone.current
        ){

          return;

        }



        setSession(session);
        setUser(session?.user ?? null);




        if(session?.user){


          // background loading
          fetchUserData(session.user.id).catch((error)=>{

            console.error(
              "User data error:",
              error
            );

          });



        }else{


          setSettings(null);
          setRole(null);


        }



        setLoading(false);


      }

    );




    return ()=>{

      mounted=false;
      subscription.unsubscribe();

    };


  }, []);





  const fetchUserData = async(userId:string)=>{


    try{


      const {
        data:settingsData,
        error:settingsError

      } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id",userId)
      .maybeSingle();



      if(settingsError){

        console.warn(
          "Settings:",
          settingsError.message
        );

      }



      if(settingsData){

        setSettings(settingsData);

      }






      const {
        data:roleData,
        error:roleError

      } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id",userId)
      .eq("is_active",true)
      .limit(1)
      .maybeSingle();





      if(roleError){

        console.warn(
          "Role:",
          roleError.message
        );

      }



      setRole(roleData ?? null);



    }catch(error){


      console.error(
        "Fetch user data error:",
        error
      );


    }


  };







  const signUp = async(
    email:string,
    password:string,
    shopName:string

  )=>{


    try{


      const {
        data,
        error

      } = await supabase.auth.signUp({

        email,
        password

      });



      if(error){

        return {
          error
        };

      }





      if(data.user){


        await supabase
        .from("user_settings")
        .insert({

          user_id:data.user.id,
          shop_name:shopName

        });


      }



      return {
        error:null
      };



    }catch(error){


      return {
        error:error as Error
      };


    }


  };








  const signIn = async(
    email:string,
    password:string

  )=>{


    try{


      const {
        error

      } = await supabase.auth.signInWithPassword({

        email,
        password

      });


      return {
        error
      };



    }catch(error){


      return {
        error:error as Error
      };


    }


  };









  const signOut = async()=>{


    await supabase.auth.signOut();


    setUser(null);
    setSession(null);
    setSettings(null);
    setRole(null);
    setLoading(false);


  };









  const updateSettings = async(
    newSettings:Partial<UserSettings>

  )=>{


    if(!user){

      return {
        error:new Error("Not authenticated")
      };

    }





    const {
      error

    } = await supabase
    .from("user_settings")
    .update(newSettings)
    .eq("user_id",user.id);





    if(!error){


      setSettings(
        prev =>
        prev
        ?
        {
          ...prev,
          ...newSettings
        }
        :
        null
      );


    }



    return {
      error
    };


  };







  return (

    <AuthContext.Provider

      value={{

        user,
        session,
        settings,
        role,
        loading,

        signUp,
        signIn,
        signOut,
        updateSettings

      }}

    >

      {children}

    </AuthContext.Provider>

  );


}








export function useAuth(){

  const context = useContext(AuthContext);


  if(!context){

    throw new Error(
      "useAuth must be used inside AuthProvider"
    );

  }


  return context;


}
